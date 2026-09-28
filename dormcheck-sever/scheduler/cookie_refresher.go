package scheduler

import (
	"dormcheck/config"
	"dormcheck/database"
	"dormcheck/logic/student"
	"dormcheck/utils"
	"log"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// StartCookieRefresher refreshes each unique student account once daily at the configured time.
func StartCookieRefresher() {
	go refreshStudentCookies()
	startConfiguredDailyJob("cookie_refresh_time", "18:00", false, refreshStudentCookies)
}

var refreshMu sync.Mutex

func refreshStudentCookies() {
	if !refreshMu.TryLock() {
		return
	}
	defer refreshMu.Unlock()
	log.Println("🔄 正在刷新所有学生 cookies...")

	var students []database.Student
	now := time.Now()
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if err := database.DB.Where("stu_id IN (SELECT stu_id FROM user_students) AND auth_status <> 'locked' AND last_login < ? AND (auth_last_failure_at IS NULL OR auth_last_failure_at < ?)", dayStart, dayStart).Find(&students).Error; err != nil {
		log.Printf("❌ 查询学生失败: %v", err)
		return
	}

	if len(students) == 0 {
		return
	}
	workers := config.GetInt("cookie_refresh_concurrency", 3)
	if workers < 1 {
		workers = 1
	}
	if workers > 20 {
		workers = 20
	}
	jobs := make(chan database.Student)
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for stu := range jobs {
				refreshOneStudent(stu)
			}
		}()
	}
	interval := time.Hour / time.Duration(len(students))
	for i, stu := range students {
		jobs <- stu
		if i < len(students)-1 {
			time.Sleep(interval)
		}
	}
	close(jobs)
	wg.Wait()
	log.Println("✅ 所有学生 cookies 刷新完成")
}

func refreshOneStudent(stu database.Student) {
	var current database.Student
	if err := database.DB.First(&current, "stu_id = ?", stu.StuID).Error; err != nil {
		return
	}
	if current.AuthStatus == "locked" || current.LastLogin.After(stu.LastLogin) {
		return
	}
	stu = current
	cookies, err := student.LoginWithoutBind(stu.StuID, stu.Password)

	// ===== 登录失败或 cookies 为空 =====
	if err != nil || cookies == nil || len(cookies) == 0 {
		failureMessage := "微学工登录未返回 Cookie"
		if err != nil {
			failureMessage = err.Error()
		}
		log.Printf("⚠️ 登录失败: 学号=%s，错误=%s", stu.StuID, failureMessage)

		// 网络、验证码或 AI 暂时故障不标成密码失效；仅凭证类失败累计失效时长。
		if isStudentCredentialFailure(failureMessage) {
			shouldNotify, locked := recordStudentCredentialFailure(stu, failureMessage)
			if locked {
				failureMessage += "；连续三天认证失败，已停止自动刷新并锁定全部任务。请更新密码并重新验证绑定，验证通过后才可恢复。"
			}
			if shouldNotify {
				sendStudentCredentialFailureNotice(stu, failureMessage)
			}
		}

		// 登录失败 → 不更新 cookies，保留旧值
		return
	}

	// ===== 登录成功才更新 cookies =====
	stu.Cookies = utils.SerializeCookies(cookies)
	stu.AuthStatus = "valid"
	stu.AuthFailedAt = nil
	stu.AuthError = ""
	stu.AuthNoticeSentAt = nil
	result := database.DB.Model(&database.Student{}).
		Where("stu_id = ? AND last_login <= ? AND auth_status <> ?", stu.StuID, stu.LastLogin, "locked").
		Updates(map[string]interface{}{
			"cookies": stu.Cookies, "last_login": time.Now(), "auth_status": "valid",
			"auth_failed_at": nil, "auth_error": "", "auth_notice_sent_at": nil,
			"auth_failure_days": 0, "auth_last_failure_at": nil, "auth_notice_count": 0,
		})
	if result.Error != nil {
		log.Printf("❌ 保存失败: 学号=%s, 错误=%v", stu.StuID, result.Error)
	} else if result.RowsAffected > 0 {
		log.Printf("✅ 学号 %s cookies 已更新", stu.StuID)
		restoreTasksAfterStudentReverification(stu.StuID)
	} else {
		log.Printf("跳过过期的 cookies 刷新结果: 学号=%s", stu.StuID)
	}

}

func isStudentCredentialFailure(message string) bool {
	message = strings.ToLower(message)
	for _, keyword := range []string{
		"用户名或密码错误", "用户名或者密码错误", "账号或密码错误", "账户或密码错误", "用户不存在或密码错误",
		"密码错误", "密码不正确", "密码已过期", "密码过期", "密码过于简单", "账号不存在", "账户不存在", "用户不存在",
		"账号已锁定", "账户已锁定", "incorrect password", "invalid password", "incorrect username or password", "user does not exist",
	} {
		if strings.Contains(message, strings.ToLower(keyword)) {
			return true
		}
	}
	return false
}

// Only distinct consecutive calendar days with confirmed credential failures count.
// Lock the student row to serialize failures with successful re-binding.
func recordStudentCredentialFailure(stu database.Student, failureMessage string) (shouldNotify, locked bool) {
	now := time.Now()
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var current database.Student
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "stu_id = ?", stu.StuID).Error; err != nil {
			return err
		}
		if current.LastLogin.After(stu.LastLogin) || current.AuthStatus == "locked" {
			return nil
		}
		days, freshDay := credentialFailureDays(now, current.AuthLastFailureAt, current.AuthFailureDays)
		if days == 1 && freshDay {
			current.AuthFailedAt = &now
		}
		current.AuthFailureDays = days
		current.AuthLastFailureAt = &now
		current.AuthError = failureMessage
		locked = days >= 3
		shouldNotify = freshDay && current.AuthNoticeCount < 3 &&
			(current.AuthNoticeSentAt == nil || current.AuthNoticeSentAt.In(now.Location()).Format("2006-01-02") != now.Format("2006-01-02"))
		if shouldNotify {
			current.AuthNoticeSentAt = &now
			current.AuthNoticeCount++
		}
		current.AuthStatus = "invalid"
		if locked {
			current.AuthStatus = "locked"
		}
		if err := tx.Save(&current).Error; err != nil {
			return err
		}
		if locked {
			return tx.Model(&database.Task{}).Where("stu_id = ? AND enabled = TRUE", stu.StuID).
				Updates(map[string]interface{}{"enabled": false, "auth_auto_paused": true}).Error
		}
		return nil
	})
	if err != nil {
		log.Printf("保存学生账号异常状态失败: %s: %v", stu.StuID, err)
		return false, false
	}
	return shouldNotify, locked
}

func credentialFailureDays(now time.Time, previous *time.Time, days int) (int, bool) {
	if previous != nil {
		last := previous.In(now.Location()).Format("2006-01-02")
		if last == now.Format("2006-01-02") {
			return days, false
		}
		if last == now.AddDate(0, 0, -1).Format("2006-01-02") && days > 0 {
			return days + 1, true
		}
	}
	return 1, true
}

func sendStudentCredentialFailureNotice(stu database.Student, failureMessage string) {
	var bindings []database.UserStudent
	if err := database.DB.Where("stu_id = ?", stu.StuID).Find(&bindings).Error; err != nil {
		log.Printf("查询失效学生绑定关系失败: 学号=%s，错误=%v", stu.StuID, err)
		return
	}
	seen := make(map[int]struct{}, len(bindings))
	for _, binding := range bindings {
		if _, exists := seen[binding.UserID]; exists {
			continue
		}
		seen[binding.UserID] = struct{}{}
		var account database.User
		if err := database.DB.First(&account, binding.UserID).Error; err != nil {
			log.Printf("查询失效学生所属用户失败: UserID=%d，错误=%v", binding.UserID, err)
			continue
		}
		if err := utils.SendAccountErrorEmail(account.Email, stu.Name, stu.StuID, failureMessage, time.Now()); err != nil {
			log.Printf("学生账号失效邮件发送失败: UserID=%d，错误=%v", account.ID, err)
		} else {
			log.Printf("已发送学生账号失效提醒: UserID=%d，学号=%s", account.ID, stu.StuID)
		}
	}
}

// Reconcile tasks belonging to locked student accounts.
func StartInvalidAccountTaskDisabler() {
	go func() {
		disableExpiredInvalidAccountTasks()
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			disableExpiredInvalidAccountTasks()
		}
	}()
}

func disableExpiredInvalidAccountTasks() {
	// Reconcile locked accounts without elapsed-time locking or login requests.
	var students []database.Student
	if err := database.DB.Where("auth_status = ? AND EXISTS (SELECT 1 FROM tasks t WHERE t.stu_id = students.stu_id AND t.enabled = TRUE)", "locked").Find(&students).Error; err != nil {
		log.Printf("查询锁定账号失败: %v", err)
		return
	}
	for _, stu := range students {
		lockTasksForInvalidStudent(stu.StuID)
	}
}

func restoreTasksAfterStudentReverification(stuID string) {
	result := database.DB.Model(&database.Task{}).
		Where("stu_id = ? AND (auth_auto_paused = TRUE OR activity_auto_paused = TRUE) AND activity_state = ? AND EXISTS (SELECT 1 FROM students s WHERE s.stu_id = tasks.stu_id AND s.auth_status = 'valid')", stuID, "normal").
		Updates(map[string]interface{}{"enabled": true, "auth_auto_paused": false, "activity_auto_paused": false})
	if result.Error != nil {
		log.Printf("学生重新验证后恢复任务失败: %s: %v", stuID, result.Error)
	} else if result.RowsAffected > 0 {
		log.Printf("学生重新验证成功，已恢复学号 %s 的 %d 个任务", stuID, result.RowsAffected)
	}
}

func lockTasksForInvalidStudent(stuID string) {
	err := database.DB.Transaction(func(tx *gorm.DB) error {
		var account database.Student
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&account, "stu_id = ?", stuID).Error; err != nil {
			return err
		}
		if account.AuthStatus != "locked" {
			return nil
		}
		return tx.Model(&database.Task{}).Where("stu_id = ? AND enabled = TRUE", stuID).
			Updates(map[string]interface{}{"enabled": false, "auth_auto_paused": true}).Error
	})
	if err != nil {
		log.Printf("锁定学生任务失败: %s: %v", stuID, err)
	}
}
