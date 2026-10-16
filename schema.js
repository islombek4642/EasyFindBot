import { table, integer, text, boolean, json, index, uniqueIndex, sql } from 'sdk/db';

export const users = table('users', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  tgId:      integer('tg_id').unique().notNull(),
  username:  text('username'),
  firstName: text('first_name'),
  lastName:  text('last_name'),
  role:      text('role').notNull().default('seeker'), // 'seeker', 'employer', 'admin'
  phone:     text('phone'),
  language:  text('language').notNull().default('uz'), // 'uz', 'ru', 'en'
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  tgIdIdx: uniqueIndex('idx_users_tg_id').on(t.tgId),
  roleIdx: index('idx_users_role').on(t.role),
}));

export const vacancies = table('vacancies', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  employerTgId:     integer('employer_tg_id').notNull(),
  title:            text('title').notNull(),
  companyName:      text('company_name').notNull(),
  category:         text('category').notNull(),
  region:           text('region').notNull(),
  employmentType:   text('employment_type').notNull(), // 'full_time', 'part_time', 'remote', 'internship'
  salaryType:       text('salary_type').notNull().default('range'), // 'range', 'fixed', 'negotiable'
  salaryMin:        integer('salary_min'),
  salaryMax:        integer('salary_max'),
  salaryCurrency:   text('salary_currency').notNull().default('USD'),
  description:      text('description').notNull(),
  requirements:     text('requirements'),
  contacts:         text('contacts').notNull(),
  status:           text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected', 'closed'
  rejectionReason:  text('rejection_reason'),
  channelMessageId: integer('channel_message_id'),
  viewsCount:       integer('views_count').notNull().default(0),
  moderatedByTgId:  integer('moderated_by_tg_id'),
  createdAt:        integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt:        integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  employerIdx: index('idx_vacancies_employer').on(t.employerTgId),
  statusIdx:   index('idx_vacancies_status').on(t.status),
  categoryIdx: index('idx_vacancies_category').on(t.category),
  regionIdx:   index('idx_vacancies_region').on(t.region),
}));

export const resumes = table('resumes', {
  id:              integer('id').primaryKey({ autoIncrement: true }),
  seekerTgId:      integer('seeker_tg_id').notNull(),
  title:           text('title').notNull(),
  category:        text('category').notNull(),
  region:          text('region').notNull(),
  experienceYears: integer('experience_years').notNull().default(0),
  expectedSalary:  integer('expected_salary'),
  salaryCurrency:  text('salary_currency').notNull().default('USD'),
  skills:          json('skills'), // Array of strings e.g. ["React", "JavaScript"]
  bio:             text('bio'),
  contacts:        text('contacts').notNull(),
  isActive:        boolean('is_active').notNull().default(true),
  createdAt:       integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt:       integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  seekerIdx:   index('idx_resumes_seeker').on(t.seekerTgId),
  categoryIdx: index('idx_resumes_category').on(t.category),
}));

export const applications = table('applications', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  vacancyId:   integer('vacancy_id').notNull(),
  seekerTgId:  integer('seeker_tg_id').notNull(),
  resumeId:    integer('resume_id'),
  coverLetter: text('cover_letter'),
  status:      text('status').notNull().default('applied'), // 'applied', 'viewed', 'accepted', 'rejected'
  createdAt:   integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt:   integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  vacancyIdx:   index('idx_app_vacancy').on(t.vacancyId),
  seekerIdx:    index('idx_app_seeker').on(t.seekerTgId),
  uniqueAppIdx: uniqueIndex('idx_app_unique').on(t.vacancyId, t.seekerTgId),
}));

export const subscriptions = table('subscriptions', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  userTgId:  integer('user_tg_id').notNull(),
  category:  text('category').notNull(),
  region:    text('region'),
  isActive:  boolean('is_active').notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
}, (t) => ({
  userTgIdIdx: index('idx_sub_user_tg_id').on(t.userTgId),
  uniqueSubIdx: uniqueIndex('idx_sub_unique').on(t.userTgId, t.category, t.region),
}));

export const settings = table('settings', {
  key:       text('key').primaryKey(),
  value:     text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});
