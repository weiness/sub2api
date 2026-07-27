package service

import (
	"context"
	"database/sql"
	"testing"
	"time"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/enttest"
	"github.com/Wei-Shaw/sub2api/internal/payment"
	"github.com/stretchr/testify/require"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "modernc.org/sqlite"
)

func TestGetPlanSoldCountMap(t *testing.T) {
	ctx := context.Background()
	client := newPaymentConfigTestClient(t, "payment_plan_sold_count")

	user, err := client.User.Create().
		SetEmail("sold-count@example.com").
		SetPasswordHash("hash").
		SetUsername("sold-count").
		Save(ctx)
	require.NoError(t, err)
	admin, err := client.User.Create().
		SetEmail("sold-count-admin@example.com").
		SetPasswordHash("hash").
		SetUsername("sold-count-admin").
		Save(ctx)
	require.NoError(t, err)
	groupOne, err := client.Group.Create().SetName("sold-count-one").Save(ctx)
	require.NoError(t, err)
	groupTwo, err := client.Group.Create().SetName("sold-count-two").Save(ctx)
	require.NoError(t, err)
	planOne, err := client.SubscriptionPlan.Create().
		SetGroupID(groupOne.ID).
		SetName("Plan One").
		SetPrice(39).
		SetBaseSoldCount(4).
		Save(ctx)
	require.NoError(t, err)
	planTwo, err := client.SubscriptionPlan.Create().
		SetGroupID(groupTwo.ID).
		SetName("Plan Two").
		SetPrice(69).
		Save(ctx)
	require.NoError(t, err)

	createOrder := func(planID *int64, orderType, status string) {
		builder := client.PaymentOrder.Create().
			SetUserID(user.ID).
			SetUserEmail(user.Email).
			SetUserName(user.Username).
			SetAmount(39).
			SetPayAmount(39).
			SetRechargeCode("sold-count").
			SetPaymentType(payment.TypeAlipay).
			SetPaymentTradeNo("").
			SetOrderType(orderType).
			SetStatus(status).
			SetExpiresAt(time.Now().Add(time.Hour)).
			SetClientIP("127.0.0.1").
			SetSrcHost("example.com")
		if planID != nil {
			builder.SetPlanID(*planID)
		}
		_, err := builder.Save(ctx)
		require.NoError(t, err)
	}

	planOneID := int64(planOne.ID)
	planTwoID := int64(planTwo.ID)
	createOrder(&planOneID, payment.OrderTypeSubscription, OrderStatusCompleted)
	createOrder(&planOneID, payment.OrderTypeSubscription, OrderStatusCompleted)
	createOrder(&planTwoID, payment.OrderTypeSubscription, OrderStatusCompleted)
	createOrder(&planOneID, payment.OrderTypeSubscription, OrderStatusPending)
	createOrder(&planOneID, payment.OrderTypeSubscription, OrderStatusRefunded)
	createOrder(&planOneID, payment.OrderTypeBalance, OrderStatusCompleted)
	createOrder(nil, payment.OrderTypeSubscription, OrderStatusCompleted)
	_, err = client.UserSubscription.Create().
		SetUserID(user.ID).
		SetGroupID(groupOne.ID).
		SetStartsAt(time.Now()).
		SetExpiresAt(time.Now().Add(30 * 24 * time.Hour)).
		SetAssignedBy(admin.ID).
		Save(ctx)
	require.NoError(t, err)

	plans := []*dbent.SubscriptionPlan{planOne, planTwo}
	counts, err := NewPaymentConfigService(client, nil, nil).GetPlanSoldCountMap(ctx, plans)
	require.NoError(t, err)
	require.Equal(t, map[int64]int{planOneID: 7, planTwoID: 1}, counts)
}

func TestListPlansForSaleOrdersRecommendedFirstThenSortOrder(t *testing.T) {
	ctx := context.Background()
	client := newPaymentConfigTestClient(t, "payment_plan_recommended_sort")
	group, err := client.Group.Create().SetName("plan-sort").Save(ctx)
	require.NoError(t, err)

	createPlan := func(name string, recommended bool, sortOrder int) {
		_, err := client.SubscriptionPlan.Create().
			SetGroupID(group.ID).
			SetName(name).
			SetPrice(39).
			SetRecommended(recommended).
			SetSortOrder(sortOrder).
			Save(ctx)
		require.NoError(t, err)
	}
	createPlan("Regular", false, 0)
	createPlan("Recommended Later", true, 20)
	createPlan("Recommended First", true, 10)

	plans, err := NewPaymentConfigService(client, nil, nil).ListPlansForSale(ctx)
	require.NoError(t, err)
	require.Equal(t, []string{"Recommended First", "Recommended Later", "Regular"}, []string{plans[0].Name, plans[1].Name, plans[2].Name})
}

func TestListPlansOrdersForSaleThenSortOrderThenID(t *testing.T) {
	ctx := context.Background()
	client := newPaymentConfigTestClient(t, "payment_plan_admin_sort")
	group, err := client.Group.Create().SetName("admin-plan-sort").Save(ctx)
	require.NoError(t, err)

	createPlan := func(name string, forSale bool, sortOrder int) {
		_, err := client.SubscriptionPlan.Create().
			SetGroupID(group.ID).
			SetName(name).
			SetPrice(39).
			SetForSale(forSale).
			SetSortOrder(sortOrder).
			Save(ctx)
		require.NoError(t, err)
	}

	createPlan("On Sale Later Sort", true, 20)
	createPlan("On Sale First ID", true, 10)
	createPlan("On Sale Second ID", true, 10)
	createPlan("Off Sale", false, 0)

	plans, err := NewPaymentConfigService(client, nil, nil).ListPlans(ctx)
	require.NoError(t, err)
	require.Equal(t,
		[]string{"On Sale First ID", "On Sale Second ID", "On Sale Later Sort", "Off Sale"},
		[]string{plans[0].Name, plans[1].Name, plans[2].Name, plans[3].Name},
	)
}

func TestUpdatePlanPersistsBaseSoldCount(t *testing.T) {
	ctx := context.Background()
	client := newPaymentConfigTestClient(t, "payment_plan_base_sold_count_update")
	group, err := client.Group.Create().SetName("base-sold-count").Save(ctx)
	require.NoError(t, err)
	plan, err := client.SubscriptionPlan.Create().
		SetGroupID(group.ID).
		SetName("Plan").
		SetPrice(39).
		Save(ctx)
	require.NoError(t, err)
	require.Zero(t, plan.BaseSoldCount)

	baseSoldCount := 9
	updated, err := NewPaymentConfigService(client, nil, nil).UpdatePlan(ctx, plan.ID, UpdatePlanRequest{BaseSoldCount: &baseSoldCount})
	require.NoError(t, err)
	require.Equal(t, baseSoldCount, updated.BaseSoldCount)
}

func newPaymentConfigTestClient(t *testing.T, databaseName string) *dbent.Client {
	t.Helper()
	db, err := sql.Open("sqlite", "file:"+databaseName+"?mode=memory&cache=shared&_fk=1")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	_, err = db.Exec("PRAGMA foreign_keys = ON")
	require.NoError(t, err)
	driver := entsql.OpenDB(dialect.SQLite, db)
	client := enttest.NewClient(t, enttest.WithOptions(dbent.Driver(driver)))
	t.Cleanup(func() { _ = client.Close() })
	return client
}
