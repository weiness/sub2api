package migrations

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestUserPhoneUniqueIndexOnlyCoversActiveUsers(t *testing.T) {
	content, err := FS.ReadFile("194_release_deleted_user_phone.sql")
	require.NoError(t, err)

	sql := strings.Join(strings.Fields(string(content)), " ")
	require.Contains(t, sql, "DROP INDEX IF EXISTS users_phone_unique")
	require.Contains(t, sql, "CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique_active")
	require.Contains(t, sql, "WHERE deleted_at IS NULL AND phone IS NOT NULL AND phone <> ''")
}
