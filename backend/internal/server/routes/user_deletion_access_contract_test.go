package routes

import (
	"os"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestUserDeletionRouteIsAdminOnly(t *testing.T) {
	adminRoutes, err := os.ReadFile("admin.go")
	require.NoError(t, err)
	userRoutes, err := os.ReadFile("user.go")
	require.NoError(t, err)

	require.Contains(t, string(adminRoutes), `users.DELETE("/:id", h.Admin.User.Delete)`)
	require.NotContains(t, string(userRoutes), "h.User.Delete")
	require.NotContains(t, string(userRoutes), `user.DELETE("",`)
}
