package service

import (
	"context"
	"strings"
	"testing"

	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/stretchr/testify/require"
)

type faqRepositoryStub struct {
	items  []FAQ
	nextID int64
}

func (r *faqRepositoryStub) List(_ context.Context, params pagination.PaginationParams, filters FAQListFilters) ([]FAQ, *pagination.PaginationResult, error) {
	filtered := make([]FAQ, 0, len(r.items))
	for _, item := range r.items {
		if filters.Title != "" && !strings.Contains(strings.ToLower(item.Title), strings.ToLower(filters.Title)) {
			continue
		}
		if filters.Enabled != nil && item.Enabled != *filters.Enabled {
			continue
		}
		filtered = append(filtered, item)
	}
	total := int64(len(filtered))
	start := params.Offset()
	if start > len(filtered) {
		start = len(filtered)
	}
	end := start + params.Limit()
	if end > len(filtered) {
		end = len(filtered)
	}
	return filtered[start:end], &pagination.PaginationResult{Total: total, Page: params.Page, PageSize: params.Limit()}, nil
}
func (r *faqRepositoryStub) ListEnabled(context.Context) ([]FAQ, error) {
	result := make([]FAQ, 0)
	for _, item := range r.items {
		if item.Enabled {
			result = append(result, item)
		}
	}
	return result, nil
}
func (r *faqRepositoryStub) GetByID(_ context.Context, id int64) (*FAQ, error) {
	for i := range r.items {
		if r.items[i].ID == id {
			item := r.items[i]
			return &item, nil
		}
	}
	return nil, ErrFAQNotFound
}
func (r *faqRepositoryStub) Create(_ context.Context, item *FAQ) error {
	r.nextID++
	item.ID = r.nextID
	r.items = append(r.items, *item)
	return nil
}
func (r *faqRepositoryStub) Update(_ context.Context, item *FAQ) error {
	for i := range r.items {
		if r.items[i].ID == item.ID {
			r.items[i] = *item
			return nil
		}
	}
	return ErrFAQNotFound
}
func (r *faqRepositoryStub) Delete(_ context.Context, id int64) error {
	for i := range r.items {
		if r.items[i].ID == id {
			r.items = append(r.items[:i], r.items[i+1:]...)
			return nil
		}
	}
	return ErrFAQNotFound
}

func TestFAQServiceCreateTrimsAndValidates(t *testing.T) {
	repo := &faqRepositoryStub{}
	service := NewFAQService(repo)
	item, err := service.Create(context.Background(), "  如何充值？ ", " 进入充值页。 ", true, 10)
	require.NoError(t, err)
	require.Equal(t, "如何充值？", item.Title)
	require.Equal(t, "进入充值页。", item.Answer)
	_, err = service.Create(context.Background(), "", "answer", true, 0)
	require.ErrorIs(t, err, ErrFAQInvalidTitle)
	_, err = service.Create(context.Background(), "title", " ", true, 0)
	require.ErrorIs(t, err, ErrFAQAnswerRequired)
}

func TestFAQServiceUpdateAndEnabledProjection(t *testing.T) {
	repo := &faqRepositoryStub{items: []FAQ{{ID: 1, Title: "旧标题", Answer: "旧回复", Enabled: false}}}
	service := NewFAQService(repo)
	title, enabled, sortOrder := "新标题", true, 20
	item, err := service.Update(context.Background(), 1, &title, nil, &enabled, &sortOrder)
	require.NoError(t, err)
	require.Equal(t, "新标题", item.Title)
	require.Equal(t, 20, item.SortOrder)
	publicItems, err := service.ListEnabled(context.Background())
	require.NoError(t, err)
	require.Len(t, publicItems, 1)
}

func TestFAQServiceListFiltersAndPaginates(t *testing.T) {
	repo := &faqRepositoryStub{items: []FAQ{
		{ID: 1, Title: "如何充值", Enabled: true},
		{ID: 2, Title: "充值到账时间", Enabled: false},
		{ID: 3, Title: "模型列表", Enabled: true},
	}}
	faqService := NewFAQService(repo)
	disabled := false

	items, result, err := faqService.List(context.Background(), pagination.PaginationParams{Page: 1, PageSize: 1}, FAQListFilters{
		Title: " 充值 ", Enabled: &disabled,
	})
	require.NoError(t, err)
	require.Equal(t, int64(1), result.Total)
	require.Len(t, items, 1)
	require.Equal(t, int64(2), items[0].ID)
}
