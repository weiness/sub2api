//go:build unit

package service

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

type updateServiceCacheStub struct {
	data string
}

func (s *updateServiceCacheStub) GetUpdateInfo(context.Context) (string, error) {
	if s.data == "" {
		return "", errors.New("cache miss")
	}
	return s.data, nil
}

func (s *updateServiceCacheStub) SetUpdateInfo(_ context.Context, data string, _ time.Duration) error {
	s.data = data
	return nil
}

type updateServiceGitHubClientStub struct {
	release    *GitHubRelease
	fetchCalls int
}

func (s *updateServiceGitHubClientStub) FetchLatestRelease(context.Context, string) (*GitHubRelease, error) {
	s.fetchCalls++
	return s.release, nil
}

func (s *updateServiceGitHubClientStub) DownloadFile(context.Context, string, string, int64) error {
	panic("DownloadFile should not be called when no update is available")
}

func (s *updateServiceGitHubClientStub) FetchChecksumFile(context.Context, string) ([]byte, error) {
	panic("FetchChecksumFile should not be called when no update is available")
}

func TestUpdateServicePerformUpdateNoUpdateReturnsSentinel(t *testing.T) {
	svc := NewUpdateService(
		&updateServiceCacheStub{},
		&updateServiceGitHubClientStub{
			release: &GitHubRelease{
				TagName: "v0.1.132",
				Name:    "v0.1.132",
			},
		},
		"0.1.132",
		"release",
	)

	err := svc.PerformUpdate(context.Background())

	require.Error(t, err)
	require.True(t, errors.Is(err, ErrNoUpdateAvailable))
	require.ErrorIs(t, err, ErrNoUpdateAvailable)
}

func TestUpdateServiceCheckUpdateDisabledDoesNotFetchRelease(t *testing.T) {
	client := &updateServiceGitHubClientStub{
		release: &GitHubRelease{
			TagName: "v9.9.9",
			Name:    "v9.9.9",
		},
	}
	svc := NewUpdateServiceWithOptions(
		&updateServiceCacheStub{},
		client,
		"0.1.132",
		"release",
		UpdateServiceOptions{CheckEnabled: false, OnlineUpdateEnabled: true},
	)

	info, err := svc.CheckUpdate(context.Background(), true)

	require.NoError(t, err)
	require.Equal(t, 0, client.fetchCalls)
	require.Equal(t, "0.1.132", info.CurrentVersion)
	require.Equal(t, "0.1.132", info.LatestVersion)
	require.False(t, info.HasUpdate)
	require.Contains(t, info.Warning, "update check is disabled")
}

func TestUpdateServicePerformUpdateDisabledReturnsSentinel(t *testing.T) {
	svc := NewUpdateServiceWithOptions(
		&updateServiceCacheStub{},
		&updateServiceGitHubClientStub{},
		"0.1.132",
		"release",
		UpdateServiceOptions{CheckEnabled: true, OnlineUpdateEnabled: false},
	)

	err := svc.PerformUpdate(context.Background())

	require.ErrorIs(t, err, ErrOnlineUpdateDisabled)
}
