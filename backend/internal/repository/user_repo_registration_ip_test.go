package repository

import (
	"context"
	"testing"
	"time"

	infraerrors "github.com/Wei-Shaw/sub2api/internal/pkg/errors"
	"github.com/Wei-Shaw/sub2api/internal/service"
	"github.com/stretchr/testify/require"
)

func registrationIPTestUser(email, ip string, limits service.RegistrationIPLimits) *service.User {
	return &service.User{
		Email:                email,
		Username:             email,
		PasswordHash:         "hash",
		Role:                 service.RoleUser,
		Status:               service.StatusActive,
		RegistrationIP:       ip,
		RegistrationIPLimits: limits,
	}
}

func TestUserRepositoryRegistrationIPLimits(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name   string
		limits service.RegistrationIPLimits
	}{
		{name: "daily", limits: service.RegistrationIPLimits{Daily: 1, Now: now}},
		{name: "weekly", limits: service.RegistrationIPLimits{Weekly: 1, Now: now}},
		{name: "monthly", limits: service.RegistrationIPLimits{Monthly: 1, Now: now}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo, _ := newUserEntRepo(t)
			ctx := context.Background()
			require.NoError(t, repo.Create(ctx, registrationIPTestUser("first@example.com", "203.0.113.10", tt.limits)))

			err := repo.Create(ctx, registrationIPTestUser("second@example.com", "203.0.113.10", tt.limits))
			require.ErrorIs(t, err, service.ErrRegistrationIPLimitExceeded)
			require.Equal(t, "REGISTRATION_IP_LIMIT_EXCEEDED", infraerrors.Reason(err))
		})
	}
}

func TestUserRepositoryRegistrationIPLimitZeroAndDifferentIPs(t *testing.T) {
	repo, _ := newUserEntRepo(t)
	ctx := context.Background()
	zero := service.RegistrationIPLimits{Now: time.Now()}
	require.NoError(t, repo.Create(ctx, registrationIPTestUser("first@example.com", "203.0.113.10", zero)))
	require.NoError(t, repo.Create(ctx, registrationIPTestUser("second@example.com", "203.0.113.10", zero)))

	limited := service.RegistrationIPLimits{Daily: 1, Now: time.Now()}
	require.NoError(t, repo.Create(ctx, registrationIPTestUser("third@example.com", "203.0.113.11", limited)))
}

func TestUserRepositoryRegistrationIPLimitIncludesSoftDeletedUsers(t *testing.T) {
	repo, _ := newUserEntRepo(t)
	ctx := context.Background()
	limits := service.RegistrationIPLimits{Daily: 1, Now: time.Now()}
	first := registrationIPTestUser("first@example.com", "203.0.113.10", limits)
	require.NoError(t, repo.Create(ctx, first))
	require.NoError(t, repo.Delete(ctx, first.ID))

	err := repo.Create(ctx, registrationIPTestUser("second@example.com", "203.0.113.10", limits))
	require.ErrorIs(t, err, service.ErrRegistrationIPLimitExceeded)
}
