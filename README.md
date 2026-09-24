# Food Waste Management

FoodRescue is a simple frontend-only academic project for recording safe surplus food donations and following their progress. It demonstrates how a small community workflow can support food waste reduction without a backend.

## Problem Statement

Usable surplus food can be wasted when donors do not have a simple way to describe it and coordinate collection. This project models a clear donation and tracking workflow.

## Objectives

- Encourage responsible food donation.
- Record food, quantity, and pickup details clearly.
- Let donors follow the status of their submissions.
- Give an administrator a simple view of users and donations.

## Features

- Responsive homepage with process, purpose, and calls to action.
- User signup, login, logout, and frontend route protection.
- Food donation form with validation for all original fields.
- User dashboard with donation history and status statistics.
- Admin dashboard with user list, donation details, statistics, status updates, and deletion.
- Friendly empty states and validation messages.
- Browser Local Storage persistence.

## Business Modules

### User Module

Users create an account, log in, submit surplus food, and view their own donation history. A donation starts with `Pending` status and can later be updated by the administrator.

### Admin Module

Administrators log in using the demo admin account, view registered users, inspect donation details, update donation status, and delete test or inappropriate records. Available statuses are `Pending`, `Accepted`, `Picked Up`, `Completed`, and `Rejected`.

## Technologies

- HTML5
- CSS3 using Grid and Flexbox
- Vanilla JavaScript
- Browser Local Storage

No framework, package manager, backend, database, or external service is used.

## Project Structure

```text
Food-Waste-Management/
├── index.html
├── login.html
├── signup.html
├── donateForm.html
├── userDashboard.html
├── admin.html
├── companyDetails.html
├── style.css
├── script.js
├── images/
└── README.md
```

## Local Storage Structure

The application uses these keys:

- `foodWaste_users`: user objects containing `id`, `name`, `email`, `phone`, `password`, and `role`.
- `foodWaste_donations`: donation objects containing donor, food, pickup, status, and creation details.
- `foodWaste_currentUser`: the current logged-in user session.

Passwords are stored as plain text because this is a local academic demonstration. This is not secure authentication and must not be used for a real service.

## Login and Signup Flow

1. A new visitor creates an account on `signup.html`.
2. The account is saved to Local Storage after validation.
3. The user logs in on `login.html`.
4. Users go to `userDashboard.html`; the administrator goes to `admin.html`.
5. Logout removes the current session from Local Storage.

The demo administrator is initialized automatically:

```text
Email: admin@foodrescue.local
Password: admin123
```

## Donation Workflow

1. A logged-in user opens `donateForm.html`.
2. The form validates contact, food, quantity, and pickup information.
3. A unique donation record is saved with `Pending` status and the user's ID.
4. The user is redirected to their dashboard to see the new record.
5. An administrator can review details and update the status.

## Admin Workflow

1. Log in with the demo admin account.
2. Review user and donation statistics.
3. Open donation details, change status, or delete a record.
4. The donor sees the updated status after refreshing their dashboard.

## How to Run

Open `index.html` in a modern browser. No installation or server is required. For the most consistent browser behavior, use VS Code Live Server or another static-file server if one is already available, but do not install project dependencies.

## Git Workflow

Review changes with `git status` before each logical commit. Suggested commit groups include homepage styling, authentication, donation storage, dashboards, responsive UI, and documentation. Do not commit generated files or push to GitHub without review.

## Limitations

This is a frontend-only academic project. Local Storage is used instead of a backend or database, so data is limited to the current browser and can be edited or cleared by the user. It does not provide secure authentication, real pickup coordination, notifications, or real-world food collection services.