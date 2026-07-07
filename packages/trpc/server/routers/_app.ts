import { router } from "@ecom/trpc/server/trpc";
import { customerAuthRouter } from "./customer/auth/_router";
import { blogRouter } from "./public/blog/_router";
import { healthRouter } from "./public/health/_router";
import { publicLanguagesRouter } from "./public/languages/_router";
import { publicPagesRouter } from "./public/pages/_router";
import { publicHsCodeRouter } from "./public/hscodes/_router";
import { adminMenusRouter } from "./viewer/admin-menus/_router";
import { auditLogsRouter } from "./viewer/audit-logs/_router";
import { authRouter } from "./viewer/auth/_router";
import { categoriesRouter } from "./viewer/categories/_router";
import { commentsRouter } from "./viewer/comments/_router";
import { contactsRouter } from "./viewer/contacts/_router";
import { contentLocksRouter } from "./viewer/content-locks/_router";
import { customFieldsRouter } from "./viewer/custom-fields/_router";
import { customerGroupsRouter } from "./viewer/customer-groups/_router";
import { customersRouter } from "./viewer/customers/_router";
import { languagesRouter } from "./viewer/languages/_router";
import { mediaRouter } from "./viewer/media/_router";
import { notificationsRouter } from "./viewer/notifications/_router";
import { pagesRouter } from "./viewer/pages/_router";
import { postsRouter } from "./viewer/posts/_router";
import { rateCardsRouter } from "./viewer/rate-cards/_router";
import { redirectsRouter } from "./viewer/redirects/_router";
import { revisionsRouter } from "./viewer/revisions/_router";
import { rolesRouter } from "./viewer/roles/_router";
import { seoRouter } from "./viewer/seo/_router";
import { settingsRouter } from "./viewer/settings/_router";
import { systemRouter } from "./viewer/system/_router";
import { tagsRouter } from "./viewer/tags/_router";
import { taxonomiesRouter } from "./viewer/taxonomies/_router";
import { templatesRouter } from "./viewer/templates/_router";
import { toolsRouter } from "./viewer/tools/_router";
import { translationsRouter } from "./viewer/translations/_router";
import { usersRouter } from "./viewer/users/_router";
import { webhooksRouter } from "./viewer/webhooks/_router";

/**
 * Root tRPC app router — split into 3 namespaces:
 *
 * - `viewer`: Admin-only routes (requires User session via NextAuth)
 * - `public`: Public routes (no auth, customer-facing read-only)
 * - `customer`: Customer routes (requires Customer session)
 */
export const appRouter = router({
  // Admin-only (authedProcedure — User model)
  viewer: router({
    auth: authRouter,
    posts: postsRouter,
    pages: pagesRouter,
    categories: categoriesRouter,
    tags: tagsRouter,
    media: mediaRouter,
    roles: rolesRouter,
    users: usersRouter,
    customFields: customFieldsRouter,
    adminMenus: adminMenusRouter,
    settings: settingsRouter,
    languages: languagesRouter,
    auditLogs: auditLogsRouter,
    system: systemRouter,
    customers: customersRouter,
    customerGroups: customerGroupsRouter,
    tools: toolsRouter,
    seo: seoRouter,
    revisions: revisionsRouter,
    translations: translationsRouter,
    webhooks: webhooksRouter,
    comments: commentsRouter,
    contacts: contactsRouter,
    notifications: notificationsRouter,
    redirects: redirectsRouter,
    taxonomies: taxonomiesRouter,
    templates: templatesRouter,
    contentLocks: contentLocksRouter,
    rateCards: rateCardsRouter,
  }),

  // Public (publicProcedure — no auth required)
  // v1 namespace for versioned API access
  public: router({
    v1: router({
      blog: blogRouter,
      pages: publicPagesRouter,
      languages: publicLanguagesRouter,
      hscode: publicHsCodeRouter,
    }),
    blog: blogRouter,
    pages: publicPagesRouter,
    languages: publicLanguagesRouter,
    hscode: publicHsCodeRouter,
    health: healthRouter,
  }),

  customer: router({
    auth: customerAuthRouter,
  }),
});

export type AppRouter = typeof appRouter;
