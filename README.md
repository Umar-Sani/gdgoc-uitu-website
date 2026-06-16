# GDGOC-UITU Community Platform

The official community platform for **Google Developer Groups on Campus (GDGoC) — UIT University, Karachi**.

GDGoC-UITU brings together students who want to learn, build, and grow with Google technologies — through workshops, hackathons, study jams, and tech talks. This platform is the chapter's digital home: a place to discover and register for events, connect with other members on a developer forum, and for organizers to run the chapter's operations from one dashboard.

It started as a Database Systems course project, but was built and engineered to a production standard — a full-stack monorepo with a real relational schema, role-based access control, payments, and email/in-app notifications, rather than a toy assignment.

---

## ✨ Features

**Public site**
- Animated landing page, about page, contact form, sponsor showcase
- Event listings with registration, Stripe-powered checkout, and ticketing
- Developer forum — threads, replies, upvotes, markdown support, moderation
- Newsletter subscription

**Member area**
- Email/password and Google OAuth authentication
- Profile management (avatar, bio, skill tags), event registrations & tickets
- Configurable in-app and email notification preferences

**Admin dashboard**
- Role-based access control (member, editor, admin, super admin)
- Event management with automatic member notifications on publish
- User management — role changes, account enable/disable
- A built-in CMS for homepage content, team, sponsors, testimonials, and featured events
- Payment transaction reporting and an audit log

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS, GSAP, Radix UI |
| Backend | Express, TypeScript, Zod validation, JWT |
| Database | PostgreSQL (hosted on Supabase) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Payments | Stripe |
| Media storage | Cloudinary |
| Email | Nodemailer via Brevo SMTP |

---

## 📂 Project Structure

```
gdgoc-uitu-website/
├── frontend/        Next.js app (App Router)
│   ├── app/
│   │   ├── (public)/    Landing, events, forum, about, contact
│   │   ├── (auth)/      Login, register, password reset, OAuth completion
│   │   ├── (member)/    Dashboard, profile, settings
│   │   └── (admin)/     Admin dashboard, CMS, user/event/payment management
│   └── components/
├── backend/          Express API
│   └── src/
│       ├── routes/      events, forum, payments, users, admin, cms, social, upload, notifications
│       ├── middleware/   Auth (Supabase JWT verification, role guards)
│       ├── lib/          Validation schemas, mailer, Cloudinary, notifications
│       └── db/           PostgreSQL connection pool
└── shared/            Shared TypeScript types used by both apps
```

---

## 📄 License

Licensed under the [Apache License 2.0](./LICENSE.md).

---

Built by **Umar Sani** & **Umair Jan**.
