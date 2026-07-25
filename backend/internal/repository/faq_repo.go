package repository

import (
	"context"

	dbent "github.com/Wei-Shaw/sub2api/ent"
	"github.com/Wei-Shaw/sub2api/ent/faq"
	"github.com/Wei-Shaw/sub2api/internal/pkg/pagination"
	"github.com/Wei-Shaw/sub2api/internal/service"
)

type faqRepository struct{ client *dbent.Client }

func NewFAQRepository(client *dbent.Client) service.FAQRepository {
	return &faqRepository{client: client}
}

func (r *faqRepository) List(ctx context.Context, params pagination.PaginationParams, filters service.FAQListFilters) ([]service.FAQ, *pagination.PaginationResult, error) {
	q := r.client.FAQ.Query()
	if filters.Title != "" {
		q = q.Where(faq.TitleContainsFold(filters.Title))
	}
	if filters.Enabled != nil {
		q = q.Where(faq.EnabledEQ(*filters.Enabled))
	}

	total, err := q.Clone().Count(ctx)
	if err != nil {
		return nil, nil, err
	}
	items, err := q.Offset(params.Offset()).Limit(params.Limit()).Order(faq.BySortOrder(), faq.ByID()).All(ctx)
	if err != nil {
		return nil, nil, err
	}
	return faqEntities(items), paginationResultFromTotal(int64(total), params), nil
}

func (r *faqRepository) ListEnabled(ctx context.Context) ([]service.FAQ, error) {
	items, err := r.client.FAQ.Query().Where(faq.EnabledEQ(true)).Order(faq.BySortOrder(), faq.ByID()).All(ctx)
	return faqEntities(items), err
}

func (r *faqRepository) GetByID(ctx context.Context, id int64) (*service.FAQ, error) {
	item, err := r.client.FAQ.Get(ctx, id)
	if err != nil {
		return nil, translatePersistenceError(err, service.ErrFAQNotFound, nil)
	}
	result := faqEntity(item)
	return &result, nil
}

func (r *faqRepository) Create(ctx context.Context, item *service.FAQ) error {
	created, err := r.client.FAQ.Create().SetTitle(item.Title).SetAnswer(item.Answer).SetEnabled(item.Enabled).SetSortOrder(item.SortOrder).Save(ctx)
	if err != nil {
		return err
	}
	*item = faqEntity(created)
	return nil
}

func (r *faqRepository) Update(ctx context.Context, item *service.FAQ) error {
	updated, err := r.client.FAQ.UpdateOneID(item.ID).SetTitle(item.Title).SetAnswer(item.Answer).SetEnabled(item.Enabled).SetSortOrder(item.SortOrder).Save(ctx)
	if err != nil {
		return translatePersistenceError(err, service.ErrFAQNotFound, nil)
	}
	*item = faqEntity(updated)
	return nil
}

func (r *faqRepository) Delete(ctx context.Context, id int64) error {
	err := r.client.FAQ.DeleteOneID(id).Exec(ctx)
	return translatePersistenceError(err, service.ErrFAQNotFound, nil)
}

func faqEntities(items []*dbent.FAQ) []service.FAQ {
	result := make([]service.FAQ, 0, len(items))
	for _, item := range items {
		result = append(result, faqEntity(item))
	}
	return result
}

func faqEntity(item *dbent.FAQ) service.FAQ {
	return service.FAQ{ID: int64(item.ID), Title: item.Title, Answer: item.Answer, Enabled: item.Enabled, SortOrder: item.SortOrder, CreatedAt: item.CreatedAt, UpdatedAt: item.UpdatedAt}
}
