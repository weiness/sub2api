package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/field"
	"entgo.io/ent/schema/index"
)

type FAQ struct{ ent.Schema }

func (FAQ) Annotations() []schema.Annotation {
	return []schema.Annotation{entsql.Annotation{Table: "faqs"}}
}

func (FAQ) Fields() []ent.Field {
	return []ent.Field{
		field.String("title").MaxLen(200).NotEmpty(),
		field.String("answer").SchemaType(map[string]string{dialect.Postgres: "text"}).NotEmpty(),
		field.Bool("enabled").Default(false),
		field.Int("sort_order").Default(0),
		field.Time("created_at").Immutable().Default(time.Now).SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
		field.Time("updated_at").Default(time.Now).UpdateDefault(time.Now).SchemaType(map[string]string{dialect.Postgres: "timestamptz"}),
	}
}

func (FAQ) Indexes() []ent.Index {
	return []ent.Index{index.Fields("enabled", "sort_order")}
}
