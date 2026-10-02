package student

import (
	"dormcheck/config"
	"dormcheck/database"
	"dormcheck/external/schoollogin"
	"dormcheck/utils"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var ErrTaskAlreadyRunning = errors.New("任务正在执行，请稍后查看结果")
var ErrTaskResultNotSaved = errors.New("任务执行结果未能保存")

const TaskClaimStaleAfter = 5 * time.Minute

// ExecuteSignTask 执行一次签到任务，并更新状态和错误信息
func ExecuteSignTask(task *database.Task) error {
	return executeSignTaskLocked(task, false)
}

func ExecuteSignTaskNow(task *database.Task) error {
	return executeSignTaskLocked(task, true)
}

func executeSignTaskLocked(task *database.Task, manual bool) error {
	if err := EnsureStudentNotBanned(task.StuID); err != nil {
		return err
	}
	if err := EnsureStudentHasEligibleBinding(task.StuID); err != nil {
		return err
	}
	claimedAt := time.Now().UTC().Truncate(time.Microsecond)
	claim := database.DB.Model(&database.Task{}).
		Where("id = ? AND (running_at IS NULL OR running_at < ?)", task.ID, claimedAt.Add(-TaskClaimStaleAfter)).
		Update("running_at", claimedAt)
	if claim.Error != nil {
		return claim.Error
	}
	if claim.RowsAffected == 0 {
		return ErrTaskAlreadyRunning
	}
	defer func() {
		if err := database.DB.Model(&database.Task{}).Where("id = ? AND running_at = ?", task.ID, claimedAt).
			Update("running_at", nil).Error; err != nil {
			log.Printf("释放任务执行标记失败: task=%d: %v", task.ID, err)
		}
		if err := database.DB.Where("id = ? AND cancel_after_run = TRUE AND running_at IS NULL", task.ID).Delete(&database.Task{}).Error; err != nil {
			log.Printf("清理等待执行结束后取消的任务失败: task=%d: %v", task.ID, err)
		}
	}()
	if err := database.DB.First(task, task.ID).Error; err != nil {
		return err
	}
	if task.CancelAfterRun {
		return errors.New("该任务已被取消")
	}
	now := time.Now()
	if !IsTaskWithinExecutionWindow(*task, now) {
		return ErrManualRunOutsideWindow
	}
	account, accountErr := database.GetStudentByStuID(task.StuID)
	if accountErr != nil {
		return accountErr
	}
	if err := EnsureStudentNotBanned(task.StuID); err != nil {
		return err
	}
	if account.AuthStatus == "locked" {
		return errors.New("学生账号连续三天认证失败，任务已锁定；请更新密码并重新验证绑定")
	}
	if !manual {
		if !task.Enabled || (task.ActivityState != "" && task.ActivityState != "normal" && !task.ActivityOverride) ||
			task.ExecStatus == "success" || task.RetryCount >= config.GetInt("task_max_retries", 3)+1 ||
			(!task.ExecutedAt.IsZero() && now.Sub(task.ExecutedAt) < time.Minute) {
			return nil
		}
		if err := EnsureStudentCanEnableTasks(task.StuID); err != nil {
			return err
		}
	}
	return executeSignTask(task, manual)
}

func executeSignTask(task *database.Task, manual bool) error {
	var updateAndReturn = func(status string, errMsg string) error {
		now := time.Now()
		updates := map[string]interface{}{}
		if manual {
			updates["last_manual_at"] = now
			updates["last_manual_status"] = status
			updates["last_manual_error"] = errMsg
		}
		// A failed manual attempt must not change the automatic retry budget,
		// cooldown or a previous successful automatic result.
		if !manual || status == "success" {
			updates["exec_status"] = status
			updates["last_error"] = errMsg
			updates["executed_at"] = now
			task.ExecStatus, task.LastError, task.ExecutedAt = status, errMsg, now
		}
		if !manual {
			task.RetryCount++
			updates["retry_count"] = task.RetryCount
		}
		result := database.DB.Model(&database.Task{}).Where("id = ? AND running_at = ?", task.ID, task.RunningAt).Updates(updates)
		if result.Error != nil {
			return fmt.Errorf("%w: %v", ErrTaskResultNotSaved, result.Error)
		}
		if result.RowsAffected == 0 {
			return ErrTaskResultNotSaved
		}
		if manual {
			task.LastManualAt, task.LastManualStatus, task.LastManualError = &now, status, errMsg
		}

		// 成功：自动和手动都通知。仅自动成功才通知就改成 `status == "success" && !manual`。
		if status == "success" {
			sendSignNotice(task, status, manual, "", now)
		}
		// 失败：仅在最后一次自动重试仍失败时通知（保持原逻辑）。
		if status == "failed" && !manual &&
			task.RetryCount >= config.GetInt("task_max_retries", 3)+1 {
			sendSignNotice(task, status, manual, errMsg, now)
		}
		// 失败：手动执行也通知。不需要就删掉这个分支。
		if status == "failed" && manual {
			sendSignNotice(task, status, manual, errMsg, now)
		}

		if errMsg != "" {
			return fmt.Errorf("%s", errMsg)
		}
		return nil
	}

	// 查询学生信息
	var stu database.Student
	if err := database.DB.First(&stu, "stu_id = ?", task.StuID).Error; err != nil {
		return updateAndReturn("failed", fmt.Sprintf("找不到学号 %s 对应的学生信息", task.StuID))
	}
	if stu.Cookies == "" {
		return updateAndReturn("failed", "用户未登录或 Cookie 缺失")
	}

	// 解析 cookie
	cookies, err := utils.DeserializeCookies(stu.Cookies)
	if err != nil {
		return updateAndReturn("failed", fmt.Sprintf("cookie 解析失败: %v", err))
	}

	// 构造请求
	form := url.Values{
		"ActivityId":     {task.ActivityID},
		"ReasonText":     {""},
		"guidValue":      {""},
		"address":        {task.Address},
		"longitudeGaoDe": {fmt.Sprintf("%.6f", task.Longitude)},
		"latitudeGaoDe":  {fmt.Sprintf("%.5f", task.Latitude)},
		"RType":          {"1"},
	}
	req, err := http.NewRequest("POST", schoollogin.SubmitSigninURL, strings.NewReader(form.Encode()))
	if err != nil {
		return updateAndReturn("failed", fmt.Sprintf("请求构造失败: %v", err))
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0")

	// 添加 Cookie
	var cookieStrs []string
	for _, ck := range cookies {
		cookieStrs = append(cookieStrs, ck.Name+"="+ck.Value)
	}
	req.Header.Set("Cookie", strings.Join(cookieStrs, "; "))

	// 发送请求
	client := schoollogin.NewSchoolClient()
	resp, err := client.Do(req)
	if err != nil {
		return updateAndReturn("failed", fmt.Sprintf("请求发送失败: %v", err))
	}
	body, err := schoollogin.ReadPlatformResponse(resp)
	if err != nil {
		return updateAndReturn("failed", err.Error())
	}

	// 解析响应
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return updateAndReturn("failed", fmt.Sprintf("响应解析失败: %v", err))
	}

	// 提取结果
	isOK, _ := result["isok"].(bool)
	msg, _ := result["msg"].(string)

	// 判断状态
	if isOK || msg == "该活动已经签到成功" {
		return updateAndReturn("success", "")
	} else {
		if strings.TrimSpace(msg) == "" {
			msg = "第三方平台未返回失败原因"
		}
		return updateAndReturn("failed", msg)
	}
}

// signNoticeRecipients 收集一条任务要通知的邮箱：绑定用户 + 任务自定义通知邮箱。
func signNoticeRecipients(task *database.Task) []string {
	var emails []string
	if err := database.DB.Table("users").Distinct("users.email").
		Joins("JOIN user_students ON user_students.user_id = users.id").
		Where("user_students.stu_id = ?", task.StuID).Pluck("users.email", &emails).Error; err != nil {
		log.Printf("查询签到通知用户失败: task=%d: %v", task.ID, err)
	}
	if task.NotifyEmail != "" {
		emails = append(emails, task.NotifyEmail)
	}
	return emails
}

// sendSignNotice 异步发送签到结果通知，manual 决定邮件里标注“手动执行”还是“自动任务”。
func sendSignNotice(task *database.Task, status string, manual bool, errMsg string, sentAt time.Time) {
	recipients := signNoticeRecipients(task)
	if len(recipients) == 0 {
		log.Printf("签到通知无收件人，跳过: task=%d", task.ID)
		return
	}
	go func(taskID uint, studentName, activityName, status string, manual bool, failure string, to []string, at time.Time) {
		seen := map[string]bool{}
		for _, recipient := range to {
			if recipient == "" || seen[recipient] {
				continue
			}
			seen[recipient] = true
			if err := utils.SendSignResultEmail(recipient, studentName, activityName, status == "success", manual, failure, at); err != nil {
				log.Printf("发送签到结果邮件失败: task=%d: %v", taskID, err)
			}
		}
	}(task.ID, task.Name, task.ActivityName, status, manual, errMsg, recipients, sentAt)
}
