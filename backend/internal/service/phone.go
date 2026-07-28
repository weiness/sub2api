package service

import (
	"context"
	"regexp"
	"strings"
)

type PhoneUserRepository interface {
	ExistsByPhone(ctx context.Context, phone string, excludeUserID int64) (bool, error)
}

func phoneExists(ctx context.Context, repo UserRepository, phone string, excludeUserID int64) (bool, error) {
	phoneRepo, ok := repo.(PhoneUserRepository)
	if !ok {
		return false, ErrServiceUnavailable
	}
	return phoneRepo.ExistsByPhone(ctx, phone, excludeUserID)
}

var mainlandPhonePattern = regexp.MustCompile(`^1[3-9][0-9]{9}$`)

func NormalizeMainlandPhone(raw string) (string, error) {
	value := strings.TrimSpace(raw)
	if strings.HasPrefix(value, "+86") {
		value = strings.TrimPrefix(value, "+86")
	}
	if !mainlandPhonePattern.MatchString(value) {
		return "", ErrInvalidPhone
	}
	return "+86" + value, nil
}

func MainlandPhoneLocalPart(normalized string) string {
	return strings.TrimPrefix(normalized, "+86")
}
