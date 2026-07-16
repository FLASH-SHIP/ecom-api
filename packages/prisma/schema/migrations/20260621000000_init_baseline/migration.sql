-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING', 'REVIEW', 'REJECTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "emailVerified" TIMESTAMP(3),
    "locale" TEXT DEFAULT 'vi',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_passwords" (
    "hash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "user_meta" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "label" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_tokens" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'mobile',
    "deviceInfo" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "group" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "userId" INTEGER NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "featuredImage" TEXT,
    "bannerImage" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "allowComments" BOOLEAN NOT NULL DEFAULT true,
    "formatType" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_translations" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "langCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "excerpt" TEXT,
    "content" TEXT,

    CONSTRAINT "post_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "parent_id" INTEGER,
    "author_id" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "lang_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "author_id" INTEGER,
    "author_type" TEXT NOT NULL DEFAULT 'User',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_translations" (
    "id" SERIAL NOT NULL,
    "tag_id" INTEGER NOT NULL,
    "lang_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "tag_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_categories" (
    "post_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "post_categories_pkey" PRIMARY KEY ("post_id","category_id")
);

-- CreateTable
CREATE TABLE "post_tags" (
    "post_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "post_tags_pkey" PRIMARY KEY ("post_id","tag_id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "featuredImage" TEXT,
    "template" TEXT DEFAULT 'default',
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" INTEGER,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "scheduledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_translations" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER NOT NULL,
    "langCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
    "content" TEXT,
    "excerpt" TEXT,

    CONSTRAINT "page_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revisions" (
    "id" SERIAL NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "referenceType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "authorId" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_folders" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "disk" TEXT NOT NULL DEFAULT 'local',
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "description" TEXT,
    "folderId" INTEGER,
    "uploadedBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "flag" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRtl" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "language_meta" (
    "id" SERIAL NOT NULL,
    "langCode" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "referenceType" TEXT NOT NULL,

    CONSTRAINT "language_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_meta" (
    "id" SERIAL NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "indexMode" TEXT DEFAULT 'index',
    "postId" INTEGER,
    "categoryId" INTEGER,
    "pageId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slugs" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "referenceId" INTEGER NOT NULL,
    "referenceType" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slug_translations" (
    "id" SERIAL NOT NULL,
    "slugId" INTEGER NOT NULL,
    "langCode" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "slug_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_groups" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "rules" JSONB,
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_items" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "placeholder" TEXT,
    "instructions" TEXT,
    "options" JSONB,
    "defaultValue" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_field_values" (
    "id" SERIAL NOT NULL,
    "fieldItemId" INTEGER NOT NULL,
    "useFor" TEXT NOT NULL,
    "useForId" INTEGER NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_menu_items" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "route" TEXT,
    "permissions" JSONB,
    "childrenDisplay" TEXT DEFAULT 'sidebar',
    "section" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_menu_item_translations" (
    "id" SERIAL NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "langCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "section" TEXT,

    CONSTRAINT "admin_menu_item_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" SERIAL NOT NULL,
    "menuId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "target" TEXT DEFAULT '_self',
    "linkType" TEXT NOT NULL DEFAULT 'custom',
    "referenceId" INTEGER,
    "referenceType" TEXT,
    "icon" TEXT,
    "cssClass" TEXT,
    "parentId" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item_translations" (
    "id" SERIAL NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "langCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "menu_item_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_logs" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "statusCode" INTEGER,
    "duration" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referer" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameChangeCount" INTEGER NOT NULL DEFAULT 0,
    "usernameChangedAt" TIMESTAMP(3),
    "name" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "hashedPassword" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "dob" DATE,
    "gender" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_social_accounts" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_activity_logs" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retries" INTEGER NOT NULL DEFAULT 3,
    "timeout" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" SERIAL NOT NULL,
    "webhookId" INTEGER NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB,
    "response" TEXT,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "customerId" INTEGER,
    "postId" INTEGER,
    "pageId" INTEGER,
    "parentId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submissions" (
    "id" SERIAL NOT NULL,
    "formSlug" TEXT NOT NULL DEFAULT 'default',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'new',
    "assigneeId" INTEGER,
    "repliedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "referenceId" INTEGER,
    "referenceType" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redirects" (
    "id" SERIAL NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "parentId" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxonomies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT,
    "structure" JSONB,
    "thumbnail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "successMessage" TEXT,
    "redirectUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmail" TEXT,
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "placeholder" TEXT,
    "helpText" TEXT,
    "defaultValue" TEXT,
    "options" JSONB,
    "validations" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "width" TEXT DEFAULT 'full',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "user_passwords_userId_key" ON "user_passwords"("userId");

-- CreateIndex
CREATE INDEX "user_meta_userId_idx" ON "user_meta"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_meta_userId_key_key" ON "user_meta"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_hashedKey_key" ON "api_keys"("hashedKey");

-- CreateIndex
CREATE INDEX "api_keys_hashedKey_idx" ON "api_keys"("hashedKey");

-- CreateIndex
CREATE INDEX "api_keys_userId_idx" ON "api_keys"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_tokenHash_key" ON "access_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "access_tokens_refreshTokenHash_key" ON "access_tokens"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "access_tokens_userId_idx" ON "access_tokens"("userId");

-- CreateIndex
CREATE INDEX "access_tokens_tokenHash_idx" ON "access_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "access_tokens_refreshTokenHash_idx" ON "access_tokens"("refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");

-- CreateIndex
CREATE INDEX "posts_status_idx" ON "posts"("status");

-- CreateIndex
CREATE INDEX "posts_slug_idx" ON "posts"("slug");

-- CreateIndex
CREATE INDEX "posts_isFeatured_idx" ON "posts"("isFeatured");

-- CreateIndex
CREATE INDEX "posts_deletedAt_idx" ON "posts"("deletedAt");

-- CreateIndex
CREATE INDEX "posts_status_deletedAt_createdAt_idx" ON "posts"("status", "deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "posts_status_deletedAt_publishedAt_idx" ON "posts"("status", "deletedAt", "publishedAt");

-- CreateIndex
CREATE INDEX "posts_scheduledAt_idx" ON "posts"("scheduledAt");

-- CreateIndex
CREATE INDEX "posts_expiresAt_idx" ON "posts"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_translations_postId_langCode_key" ON "post_translations"("postId", "langCode");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_status_idx" ON "categories"("status");

-- CreateIndex
CREATE INDEX "categories_deleted_at_idx" ON "categories"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_category_id_lang_code_key" ON "category_translations"("category_id", "lang_code");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tag_translations_tag_id_lang_code_key" ON "tag_translations"("tag_id", "lang_code");

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_authorId_idx" ON "pages"("authorId");

-- CreateIndex
CREATE INDEX "pages_status_idx" ON "pages"("status");

-- CreateIndex
CREATE INDEX "pages_slug_idx" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_parentId_idx" ON "pages"("parentId");

-- CreateIndex
CREATE INDEX "pages_deletedAt_idx" ON "pages"("deletedAt");

-- CreateIndex
CREATE INDEX "pages_status_deletedAt_order_idx" ON "pages"("status", "deletedAt", "order");

-- CreateIndex
CREATE UNIQUE INDEX "page_translations_pageId_langCode_key" ON "page_translations"("pageId", "langCode");

-- CreateIndex
CREATE INDEX "revisions_referenceId_referenceType_idx" ON "revisions"("referenceId", "referenceType");

-- CreateIndex
CREATE INDEX "revisions_authorId_idx" ON "revisions"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "media_folders_slug_key" ON "media_folders"("slug");

-- CreateIndex
CREATE INDEX "media_folders_parentId_idx" ON "media_folders"("parentId");

-- CreateIndex
CREATE INDEX "media_folders_slug_idx" ON "media_folders"("slug");

-- CreateIndex
CREATE INDEX "media_files_folderId_idx" ON "media_files"("folderId");

-- CreateIndex
CREATE INDEX "media_files_mimeType_idx" ON "media_files"("mimeType");

-- CreateIndex
CREATE INDEX "media_files_uploadedBy_idx" ON "media_files"("uploadedBy");

-- CreateIndex
CREATE UNIQUE INDEX "languages_locale_key" ON "languages"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "languages_code_key" ON "languages"("code");

-- CreateIndex
CREATE INDEX "language_meta_langCode_idx" ON "language_meta"("langCode");

-- CreateIndex
CREATE INDEX "language_meta_origin_idx" ON "language_meta"("origin");

-- CreateIndex
CREATE INDEX "language_meta_referenceId_referenceType_idx" ON "language_meta"("referenceId", "referenceType");

-- CreateIndex
CREATE UNIQUE INDEX "language_meta_referenceId_referenceType_key" ON "language_meta"("referenceId", "referenceType");

-- CreateIndex
CREATE UNIQUE INDEX "seo_meta_postId_key" ON "seo_meta"("postId");

-- CreateIndex
CREATE UNIQUE INDEX "seo_meta_categoryId_key" ON "seo_meta"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "seo_meta_pageId_key" ON "seo_meta"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "slugs_key_prefix_key" ON "slugs"("key", "prefix");

-- CreateIndex
CREATE UNIQUE INDEX "slugs_referenceId_referenceType_key" ON "slugs"("referenceId", "referenceType");

-- CreateIndex
CREATE UNIQUE INDEX "slug_translations_slugId_langCode_key" ON "slug_translations"("slugId", "langCode");

-- CreateIndex
CREATE INDEX "field_groups_status_idx" ON "field_groups"("status");

-- CreateIndex
CREATE INDEX "field_items_parentId_idx" ON "field_items"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "field_items_groupId_slug_key" ON "field_items"("groupId", "slug");

-- CreateIndex
CREATE INDEX "custom_field_values_useFor_useForId_idx" ON "custom_field_values"("useFor", "useForId");

-- CreateIndex
CREATE UNIQUE INDEX "custom_field_values_fieldItemId_useFor_useForId_key" ON "custom_field_values"("fieldItemId", "useFor", "useForId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_menu_items_key_key" ON "admin_menu_items"("key");

-- CreateIndex
CREATE INDEX "admin_menu_items_parentId_idx" ON "admin_menu_items"("parentId");

-- CreateIndex
CREATE INDEX "admin_menu_items_priority_idx" ON "admin_menu_items"("priority");

-- CreateIndex
CREATE INDEX "admin_menu_items_isActive_idx" ON "admin_menu_items"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "admin_menu_item_translations_menuItemId_langCode_key" ON "admin_menu_item_translations"("menuItemId", "langCode");

-- CreateIndex
CREATE UNIQUE INDEX "menus_name_key" ON "menus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "menus_slug_key" ON "menus"("slug");

-- CreateIndex
CREATE INDEX "menus_location_idx" ON "menus"("location");

-- CreateIndex
CREATE INDEX "menus_isActive_idx" ON "menus"("isActive");

-- CreateIndex
CREATE INDEX "menu_items_menuId_idx" ON "menu_items"("menuId");

-- CreateIndex
CREATE INDEX "menu_items_parentId_idx" ON "menu_items"("parentId");

-- CreateIndex
CREATE INDEX "menu_items_position_idx" ON "menu_items"("position");

-- CreateIndex
CREATE UNIQUE INDEX "menu_item_translations_menuItemId_langCode_key" ON "menu_item_translations"("menuItemId", "langCode");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "request_logs_userId_idx" ON "request_logs"("userId");

-- CreateIndex
CREATE INDEX "request_logs_method_idx" ON "request_logs"("method");

-- CreateIndex
CREATE INDEX "request_logs_statusCode_idx" ON "request_logs"("statusCode");

-- CreateIndex
CREATE INDEX "request_logs_createdAt_idx" ON "request_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_username_key" ON "customers"("username");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_username_idx" ON "customers"("username");

-- CreateIndex
CREATE INDEX "customer_social_accounts_customer_id_idx" ON "customer_social_accounts"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_social_accounts_provider_provider_id_key" ON "customer_social_accounts"("provider", "provider_id");

-- CreateIndex
CREATE INDEX "customer_activity_logs_customerId_idx" ON "customer_activity_logs"("customerId");

-- CreateIndex
CREATE INDEX "customer_activity_logs_action_idx" ON "customer_activity_logs"("action");

-- CreateIndex
CREATE INDEX "customer_activity_logs_createdAt_idx" ON "customer_activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "webhook_logs_webhookId_idx" ON "webhook_logs"("webhookId");

-- CreateIndex
CREATE INDEX "webhook_logs_event_idx" ON "webhook_logs"("event");

-- CreateIndex
CREATE INDEX "webhook_logs_createdAt_idx" ON "webhook_logs"("createdAt");

-- CreateIndex
CREATE INDEX "comments_postId_idx" ON "comments"("postId");

-- CreateIndex
CREATE INDEX "comments_pageId_idx" ON "comments"("pageId");

-- CreateIndex
CREATE INDEX "comments_parentId_idx" ON "comments"("parentId");

-- CreateIndex
CREATE INDEX "comments_status_idx" ON "comments"("status");

-- CreateIndex
CREATE INDEX "comments_createdAt_idx" ON "comments"("createdAt");

-- CreateIndex
CREATE INDEX "contact_submissions_formSlug_idx" ON "contact_submissions"("formSlug");

-- CreateIndex
CREATE INDEX "contact_submissions_status_idx" ON "contact_submissions"("status");

-- CreateIndex
CREATE INDEX "contact_submissions_createdAt_idx" ON "contact_submissions"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_fromPath_key" ON "redirects"("fromPath");

-- CreateIndex
CREATE INDEX "redirects_fromPath_idx" ON "redirects"("fromPath");

-- CreateIndex
CREATE INDEX "redirects_isActive_idx" ON "redirects"("isActive");

-- CreateIndex
CREATE INDEX "taxonomies_type_idx" ON "taxonomies"("type");

-- CreateIndex
CREATE INDEX "taxonomies_parentId_idx" ON "taxonomies"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomies_slug_type_key" ON "taxonomies"("slug", "type");

-- CreateIndex
CREATE UNIQUE INDEX "content_templates_slug_key" ON "content_templates"("slug");

-- CreateIndex
CREATE INDEX "content_templates_type_idx" ON "content_templates"("type");

-- CreateIndex
CREATE UNIQUE INDEX "forms_slug_key" ON "forms"("slug");

-- CreateIndex
CREATE INDEX "forms_isActive_idx" ON "forms"("isActive");

-- CreateIndex
CREATE INDEX "form_fields_formId_idx" ON "form_fields"("formId");

-- CreateIndex
CREATE INDEX "form_fields_position_idx" ON "form_fields"("position");

-- CreateIndex
CREATE INDEX "form_submissions_formId_idx" ON "form_submissions"("formId");

-- CreateIndex
CREATE INDEX "form_submissions_isRead_idx" ON "form_submissions"("isRead");

-- CreateIndex
CREATE INDEX "form_submissions_createdAt_idx" ON "form_submissions"("createdAt");

-- AddForeignKey
ALTER TABLE "user_passwords" ADD CONSTRAINT "user_passwords_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_meta" ADD CONSTRAINT "user_meta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_translations" ADD CONSTRAINT "tag_translations_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_categories" ADD CONSTRAINT "post_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_folders" ADD CONSTRAINT "media_folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "media_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "language_meta" ADD CONSTRAINT "language_meta_langCode_fkey" FOREIGN KEY ("langCode") REFERENCES "languages"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slug_translations" ADD CONSTRAINT "slug_translations_slugId_fkey" FOREIGN KEY ("slugId") REFERENCES "slugs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_items" ADD CONSTRAINT "field_items_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "field_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_items" ADD CONSTRAINT "field_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "field_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_fieldItemId_fkey" FOREIGN KEY ("fieldItemId") REFERENCES "field_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_menu_items" ADD CONSTRAINT "admin_menu_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "admin_menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_menu_item_translations" ADD CONSTRAINT "admin_menu_item_translations_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "admin_menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item_translations" ADD CONSTRAINT "menu_item_translations_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_logs" ADD CONSTRAINT "request_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_social_accounts" ADD CONSTRAINT "customer_social_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_activity_logs" ADD CONSTRAINT "customer_activity_logs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_submissions" ADD CONSTRAINT "contact_submissions_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomies" ADD CONSTRAINT "taxonomies_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "taxonomies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =========================================================================
-- Rename columns of categories (camelCase -> snake_case) for existing DB
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='isFeatured') THEN
        ALTER TABLE "categories" RENAME COLUMN "isFeatured" TO "is_featured";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='isDefault') THEN
        ALTER TABLE "categories" RENAME COLUMN "isDefault" TO "is_default";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='parentId') THEN
        ALTER TABLE "categories" RENAME COLUMN "parentId" TO "parent_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='authorId') THEN
        ALTER TABLE "categories" RENAME COLUMN "authorId" TO "author_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='deletedAt') THEN
        ALTER TABLE "categories" RENAME COLUMN "deletedAt" TO "deleted_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='createdAt') THEN
        ALTER TABLE "categories" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='updatedAt') THEN
        ALTER TABLE "categories" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
END $$;

-- =========================================================================
-- Rename columns of category_translations (camelCase -> snake_case) for existing DB
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='category_translations' AND column_name='categoryId') THEN
        ALTER TABLE "category_translations" RENAME COLUMN "categoryId" TO "category_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='category_translations' AND column_name='langCode') THEN
        ALTER TABLE "category_translations" RENAME COLUMN "langCode" TO "lang_code";
    END IF;
END $$;

-- =========================================================================
-- Recreate indexes and constraints for categories and category_translations
-- =========================================================================
DROP INDEX IF EXISTS "categories_parentId_idx";
DROP INDEX IF EXISTS "categories_deletedAt_idx";
DROP INDEX IF EXISTS "category_translations_categoryId_langCode_key";

CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "categories"("parent_id");
CREATE INDEX IF NOT EXISTS "categories_deleted_at_idx" ON "categories"("deleted_at");
CREATE UNIQUE INDEX IF NOT EXISTS "category_translations_category_id_lang_code_key" ON "category_translations"("category_id", "lang_code");

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'categories_parentId_fkey' AND table_name = 'categories'
    ) THEN
        ALTER TABLE "categories" DROP CONSTRAINT "categories_parentId_fkey";
    END IF;
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'categories_parent_id_fkey' AND table_name = 'categories'
    ) THEN
        ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'category_translations_categoryId_fkey' AND table_name = 'category_translations'
    ) THEN
        ALTER TABLE "category_translations" DROP CONSTRAINT "category_translations_categoryId_fkey";
    END IF;
END $$;

-- =========================================================================
-- Rename columns of posts (camelCase -> snake_case) for existing DB
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='featuredImage') THEN
        ALTER TABLE "posts" RENAME COLUMN "featuredImage" TO "featured_image";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='bannerImage') THEN
        ALTER TABLE "posts" RENAME COLUMN "bannerImage" TO "banner_image";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='isFeatured') THEN
        ALTER TABLE "posts" RENAME COLUMN "isFeatured" TO "is_featured";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='allowComments') THEN
        ALTER TABLE "posts" RENAME COLUMN "allowComments" TO "allow_comments";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='formatType') THEN
        ALTER TABLE "posts" RENAME COLUMN "formatType" TO "format_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='externalSource') THEN
        ALTER TABLE "posts" RENAME COLUMN "externalSource" TO "external_source";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='sponsoredBy') THEN
        ALTER TABLE "posts" RENAME COLUMN "sponsoredBy" TO "sponsored_by";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='authorId') THEN
        ALTER TABLE "posts" RENAME COLUMN "authorId" TO "author_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='publishedAt') THEN
        ALTER TABLE "posts" RENAME COLUMN "publishedAt" TO "published_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='scheduledAt') THEN
        ALTER TABLE "posts" RENAME COLUMN "scheduledAt" TO "scheduled_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='expiresAt') THEN
        ALTER TABLE "posts" RENAME COLUMN "expiresAt" TO "expires_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='deletedAt') THEN
        ALTER TABLE "posts" RENAME COLUMN "deletedAt" TO "deleted_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='createdAt') THEN
        ALTER TABLE "posts" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='updatedAt') THEN
        ALTER TABLE "posts" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
END $$;

-- =========================================================================
-- Rename columns of post_translations (camelCase -> snake_case) for existing DB
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_translations' AND column_name='postId') THEN
        ALTER TABLE "post_translations" RENAME COLUMN "postId" TO "post_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='post_translations' AND column_name='langCode') THEN
        ALTER TABLE "post_translations" RENAME COLUMN "langCode" TO "lang_code";
    END IF;
END $$;

-- =========================================================================
-- Rename columns of pages (camelCase -> snake_case) for existing DB
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='featuredImage') THEN
        ALTER TABLE "pages" RENAME COLUMN "featuredImage" TO "featured_image";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='parentId') THEN
        ALTER TABLE "pages" RENAME COLUMN "parentId" TO "parent_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='authorId') THEN
        ALTER TABLE "pages" RENAME COLUMN "authorId" TO "author_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='publishedAt') THEN
        ALTER TABLE "pages" RENAME COLUMN "publishedAt" TO "published_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='scheduledAt') THEN
        ALTER TABLE "pages" RENAME COLUMN "scheduledAt" TO "scheduled_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='deletedAt') THEN
        ALTER TABLE "pages" RENAME COLUMN "deletedAt" TO "deleted_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='createdAt') THEN
        ALTER TABLE "pages" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='updatedAt') THEN
        ALTER TABLE "pages" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='bannerImage') THEN
        ALTER TABLE "pages" RENAME COLUMN "bannerImage" TO "banner_image";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='heroBanner') THEN
        ALTER TABLE "pages" RENAME COLUMN "heroBanner" TO "hero_banner";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='hideTitle') THEN
        ALTER TABLE "pages" RENAME COLUMN "hideTitle" TO "hide_title";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='hideBreadcrumb') THEN
        ALTER TABLE "pages" RENAME COLUMN "hideBreadcrumb" TO "hide_breadcrumb";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='hideSidebar') THEN
        ALTER TABLE "pages" RENAME COLUMN "hideSidebar" TO "hide_sidebar";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='hideFooter') THEN
        ALTER TABLE "pages" RENAME COLUMN "hideFooter" TO "hide_footer";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='ctaText') THEN
        ALTER TABLE "pages" RENAME COLUMN "ctaText" TO "cta_text";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pages' AND column_name='ctaLink') THEN
        ALTER TABLE "pages" RENAME COLUMN "ctaLink" TO "cta_link";
    END IF;
END $$;

-- =========================================================================
-- Rename columns of page_translations (camelCase -> snake_case) for existing DB
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_translations' AND column_name='pageId') THEN
        ALTER TABLE "page_translations" RENAME COLUMN "pageId" TO "page_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_translations' AND column_name='langCode') THEN
        ALTER TABLE "page_translations" RENAME COLUMN "langCode" TO "lang_code";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_translations' AND column_name='ctaText') THEN
        ALTER TABLE "page_translations" RENAME COLUMN "ctaText" TO "cta_text";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='page_translations' AND column_name='ctaLink') THEN
        ALTER TABLE "page_translations" RENAME COLUMN "ctaLink" TO "cta_link";
    END IF;
END $$;

-- =========================================================================
-- Recreate indexes and constraints for posts, post_translations, pages, page_translations
-- =========================================================================
DROP INDEX IF EXISTS "posts_authorId_idx";
DROP INDEX IF EXISTS "posts_isFeatured_idx";
DROP INDEX IF EXISTS "posts_deletedAt_idx";
DROP INDEX IF EXISTS "posts_status_deletedAt_createdAt_idx";
DROP INDEX IF EXISTS "posts_status_deletedAt_publishedAt_idx";
DROP INDEX IF EXISTS "posts_scheduledAt_idx";
DROP INDEX IF EXISTS "posts_expiresAt_idx";
DROP INDEX IF EXISTS "post_translations_postId_langCode_key";

DROP INDEX IF EXISTS "pages_authorId_idx";
DROP INDEX IF EXISTS "pages_parentId_idx";
DROP INDEX IF EXISTS "pages_deletedAt_idx";
DROP INDEX IF EXISTS "pages_status_deletedAt_order_idx";
DROP INDEX IF EXISTS "page_translations_pageId_langCode_key";

CREATE INDEX IF NOT EXISTS "posts_author_id_idx" ON "posts"("author_id");
CREATE INDEX IF NOT EXISTS "posts_is_featured_idx" ON "posts"("is_featured");
CREATE INDEX IF NOT EXISTS "posts_deleted_at_idx" ON "posts"("deleted_at");
CREATE INDEX IF NOT EXISTS "posts_status_deleted_at_created_at_idx" ON "posts"("status", "deleted_at", "created_at");
CREATE INDEX IF NOT EXISTS "posts_status_deleted_at_published_at_idx" ON "posts"("status", "deleted_at", "published_at");
CREATE INDEX IF NOT EXISTS "posts_scheduled_at_idx" ON "posts"("scheduled_at");
CREATE INDEX IF NOT EXISTS "posts_expires_at_idx" ON "posts"("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "post_translations_post_id_lang_code_key" ON "post_translations"("post_id", "lang_code");

CREATE INDEX IF NOT EXISTS "pages_author_id_idx" ON "pages"("author_id");
CREATE INDEX IF NOT EXISTS "pages_parent_id_idx" ON "pages"("parent_id");
CREATE INDEX IF NOT EXISTS "pages_deleted_at_idx" ON "pages"("deleted_at");
CREATE INDEX IF NOT EXISTS "pages_status_deleted_at_order_idx" ON "pages"("status", "deleted_at", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "page_translations_page_id_lang_code_key" ON "page_translations"("page_id", "lang_code");

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_authorId_fkey' AND table_name = 'posts'
    ) THEN
        ALTER TABLE "posts" DROP CONSTRAINT "posts_authorId_fkey";
    END IF;
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_author_id_fkey' AND table_name = 'posts'
    ) THEN
        ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_translations_postId_fkey' AND table_name = 'post_translations'
    ) THEN
        ALTER TABLE "post_translations" DROP CONSTRAINT "post_translations_postId_fkey";
    END IF;
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'post_translations_post_id_fkey' AND table_name = 'post_translations'
    ) THEN
        ALTER TABLE "post_translations" ADD CONSTRAINT "post_translations_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'pages_authorId_fkey' AND table_name = 'pages'
    ) THEN
        ALTER TABLE "pages" DROP CONSTRAINT "pages_authorId_fkey";
    END IF;
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'pages_author_id_fkey' AND table_name = 'pages'
    ) THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'pages_parentId_fkey' AND table_name = 'pages'
    ) THEN
        ALTER TABLE "pages" DROP CONSTRAINT "pages_parentId_fkey";
    END IF;
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'pages_parent_id_fkey' AND table_name = 'pages'
    ) THEN
        ALTER TABLE "pages" ADD CONSTRAINT "pages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'page_translations_pageId_fkey' AND table_name = 'page_translations'
    ) THEN
        ALTER TABLE "page_translations" DROP CONSTRAINT "page_translations_pageId_fkey";
    END IF;
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'page_translations_page_id_fkey' AND table_name = 'page_translations'
    ) THEN
        ALTER TABLE "page_translations" ADD CONSTRAINT "page_translations_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
