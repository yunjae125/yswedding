import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const messages=sqliteTable('messages',{
 id:text('id').primaryKey(),name:text('name').notNull(),message:text('message').notNull(),
 salt:text('salt').notNull(),hash:text('hash').notNull(),created:integer('created').notNull()
},table=>[index('messages_created').on(table.created)]);
