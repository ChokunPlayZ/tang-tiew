import { pgTable, text, serial, timestamp, integer, boolean, numeric } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// -----------------------------------------------------------------------------
// Users & Auth
// -----------------------------------------------------------------------------

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    phoneNumber: text('phone_number').notNull().unique(), // Used for login
    displayName: text('display_name'),
    promptPayId: text('prompt_pay_id'), // National ID or Phone Number for receiving payments
    promptPayType: text('prompt_pay_type').default('PHONE'), // PHONE or NATIONAL_ID
    profilePictureUrl: text('profile_picture_url'),
    createdAt: timestamp('created_at').defaultNow(),
})

export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(),
    userId: integer('user_id').references(() => users.id).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
    memberships: many(tripMembers),
    expensesPaid: many(expenses),
    expenseShares: many(expenseShares),
    paymentsMade: many(payments),
    paymentsReceived: many(payments),
}))

// -----------------------------------------------------------------------------
// Trips & Groups
// -----------------------------------------------------------------------------

export const trips = pgTable('trips', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull().unique(), // 6-character join code
    createdBy: integer('created_by').references(() => users.id),
    isArchived: boolean('is_archived').default(false),
    createdAt: timestamp('created_at').defaultNow(),
})

export const tripMembers = pgTable('trip_members', {
    id: serial('id').primaryKey(),
    tripId: integer('trip_id').references(() => trips.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    joinedAt: timestamp('joined_at').defaultNow(),
})

export const subGroups = pgTable('sub_groups', {
    id: serial('id').primaryKey(),
    tripId: integer('trip_id').references(() => trips.id).notNull(),
    name: text('name').notNull(), // e.g. "Car A", "Alcohol"
    createdAt: timestamp('created_at').defaultNow(),
})

export const subGroupMembers = pgTable('sub_group_members', {
    id: serial('id').primaryKey(),
    subGroupId: integer('sub_group_id').references(() => subGroups.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    joinedAt: timestamp('joined_at').defaultNow(),
})

export const tripsRelations = relations(trips, ({ many }) => ({
    members: many(tripMembers),
    subGroups: many(subGroups),
    expenses: many(expenses),
}))

export const subGroupsRelations = relations(subGroups, ({ one, many }) => ({
    trip: one(trips, {
        fields: [subGroups.tripId],
        references: [trips.id],
    }),
    members: many(subGroupMembers),
}))

// -----------------------------------------------------------------------------
// Expenses
// -----------------------------------------------------------------------------

export const expenses = pgTable('expenses', {
    id: serial('id').primaryKey(),
    tripId: integer('trip_id').references(() => trips.id).notNull(),
    paidByUserId: integer('paid_by_user_id').references(() => users.id).notNull(),
    title: text('title').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    splitType: text('split_type').default('EQUAL'), // EQUAL, EXACT, SHARES
    createdAt: timestamp('created_at').defaultNow(),
})

export const expenseShares = pgTable('expense_shares', {
    id: serial('id').primaryKey(),
    expenseId: integer('expense_id').references(() => expenses.id).notNull(),
    userId: integer('user_id').references(() => users.id).notNull(),
    owesAmount: numeric('owes_amount', { precision: 10, scale: 2 }).notNull(),
})

export const expensesRelations = relations(expenses, ({ one, many }) => ({
    trip: one(trips, {
        fields: [expenses.tripId],
        references: [trips.id],
    }),
    paidBy: one(users, {
        fields: [expenses.paidByUserId],
        references: [users.id],
    }),
    shares: many(expenseShares),
}))

export const expenseSharesRelations = relations(expenseShares, ({ one }) => ({
    expense: one(expenses, {
        fields: [expenseShares.expenseId],
        references: [expenses.id],
    }),
    user: one(users, {
        fields: [expenseShares.userId],
        references: [users.id],
    }),
}))

// -----------------------------------------------------------------------------
// Settlements
// -----------------------------------------------------------------------------

export const payments = pgTable('payments', {
    id: serial('id').primaryKey(),
    tripId: integer('trip_id').references(() => trips.id).notNull(),
    fromUserId: integer('from_user_id').references(() => users.id).notNull(),
    toUserId: integer('to_user_id').references(() => users.id).notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    slipUrl: text('slip_url'), // Uploaded slip image
    status: text('status').default('PENDING'), // PENDING, VERIFIED
    createdAt: timestamp('created_at').defaultNow(),
})

export const paymentsRelations = relations(payments, ({ one }) => ({
    trip: one(trips, {
        fields: [payments.tripId],
        references: [trips.id],
    }),
    fromUser: one(users, {
        fields: [payments.fromUserId],
        references: [users.id],
    }),
    toUser: one(users, {
        fields: [payments.toUserId],
        references: [users.id],
    }),
}))

