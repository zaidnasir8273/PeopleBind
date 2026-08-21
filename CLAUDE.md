# PeopleBind — Claude Code Master Instructions

## 01. PROJECT IDENTITY

PeopleBind is a modern B2B SaaS HR platform designed to help businesses manage their people, HR operations, attendance, leave, payroll, performance, documents, reporting, and employee administration from one unified platform.

The product should feel like a serious, premium SaaS product — not a template, admin panel, or AI-generated dashboard.

### Primary Product Goal

Build PeopleBind as:

* Modern
* Professional
* Extremely usable
* Fast
* Visually polished
* Consistent
* Modular
* Scalable
* Responsive
* Accessible
* Animation-rich but never distracting

The product should feel comparable in quality to premium products such as Linear, Stripe, Vercel, Notion, Ramp, Rippling, Deel, and other high-quality modern SaaS products.

Do NOT blindly copy these products. Use them only as quality references.

---

# 02. CORE DEVELOPMENT PRINCIPLES

Before modifying anything:

1. Inspect the existing codebase.
2. Understand the existing architecture.
3. Identify reusable components.
4. Identify existing design tokens.
5. Identify existing data flows.
6. Identify existing API/database integrations.
7. Preserve working functionality.
8. Avoid unnecessary rewrites.
9. Reuse existing components whenever practical.
10. Make changes incrementally.

Never replace an entire page simply because it could be implemented differently.

Prefer:

EXISTING SYSTEM → IMPROVEMENT

over:

EXISTING SYSTEM → COMPLETE REWRITE

unless the existing architecture is genuinely preventing progress.

---

# 03. IMPORTANT RULE

FUNCTIONALITY ALWAYS COMES FIRST.

Never sacrifice:

* Database functionality
* Authentication
* Authorization
* API integrations
* Form submission
* Validation
* State management
* Routing
* Existing business logic
* Existing permissions
* Data integrity

for visual improvements.

If a visual change risks breaking functionality, preserve functionality and find a safer implementation.

---

# 04. DESIGN PHILOSOPHY

PeopleBind should follow a premium modern SaaS design philosophy.

Use the principles associated with high-quality interaction design:

* Intentional
* Minimal
* Responsive
* Tactile
* Fast
* Clear
* Calm
* Refined

Use the existing Emil Kowalski-inspired interaction philosophy where appropriate.

Do not blindly imitate a specific designer.

The objective is:

"Premium interaction quality."

Not:

"Maximum animation."

---

# 05. AVOID GENERIC AI UI

Never automatically fall into the following patterns:

* Excessive purple gradients
* Generic blue SaaS dashboards
* Giant gradient hero sections
* Excessive glassmorphism
* Excessive rounded cards
* Random floating blobs
* Decorative shapes without purpose
* Excessive shadows
* Huge headings everywhere
* Emoji as UI icons
* Random icon libraries
* Excessive badges
* Excessive pill-shaped buttons
* Every section inside a card
* Excessive borders
* Excessive animation
* Generic dashboard templates
* Visually noisy interfaces

If a design looks like something generated from a generic "modern SaaS dashboard" prompt, reconsider it.

---

# 06. VISUAL HIERARCHY

Every screen must have a clear hierarchy.

Users should immediately understand:

1. Where they are
2. What they can do
3. What requires attention
4. What information matters most
5. What action should happen next

Avoid making every element visually loud.

Primary actions should be obvious.

Secondary actions should remain secondary.

Supporting information should visually recede.

---

# 07. COLOR SYSTEM

Use a restrained professional color system.

Prefer:

* White
* Off-white
* Neutral grays
* Soft beige/neutrals where appropriate
* Dark text
* One primary brand/accent color
* Semantic success/warning/error colors

Do not introduce new colors arbitrarily.

If the project already contains design tokens, reuse them.

Do not hard-code colors repeatedly.

Use centralized variables/tokens.

---

# 08. TYPOGRAPHY

Typography must feel premium and intentional.

Prioritize:

* Clear hierarchy
* Excellent readability
* Appropriate line-height
* Consistent font weights
* Controlled letter spacing
* Proper text density

Avoid unnecessarily huge typography inside application interfaces.

Dashboard UI should prioritize information density without becoming cramped.

Use the project's existing font system unless there is a strong reason to change it.

---

# 09. SPACING

Use a consistent spacing system.

Do not manually invent arbitrary spacing values throughout components.

Prefer the existing design tokens / Tailwind spacing system.

Maintain consistent:

* Page padding
* Section spacing
* Card padding
* Form spacing
* Table spacing
* Navigation spacing
* Modal spacing

Whitespace is part of the design.

---

# 10. COMPONENT SYSTEM

Use reusable components.

Prefer:

* shadcn/ui
* Existing PeopleBind components
* Tailwind CSS
* Radix primitives where already present
* Lucide icons

Do not create duplicate components when an equivalent component already exists.

Before creating a component:

1. Search the repository.
2. Check existing shared components.
3. Reuse or extend when appropriate.

---

# 11. ICON SYSTEM

Use Lucide icons consistently.

Do not introduce random icon libraries unless explicitly required.

Do not use emoji as functional UI icons.

Icons should:

* Have consistent sizing
* Have consistent stroke weight
* Align correctly with text
* Communicate meaning
* Not visually overpower the interface

Use icons as functional communication rather than decoration.

---

# 12. ANIMATION SYSTEM

Motion is an important part of PeopleBind's visual identity.

However:

ANIMATION ≠ DECORATION.

Every animation should have a reason.

Use animation to:

* Communicate state changes
* Provide feedback
* Establish hierarchy
* Guide attention
* Make navigation feel fluid
* Improve perceived performance
* Make interactions feel tactile
* Explain transitions

Do not animate elements simply because animation is available.

---

# 13. PRIMARY ANIMATION LIBRARY

Use Motion as the default animation system for React UI.

Preferred import:

import { motion } from "motion/react"

Do not introduce Framer Motion independently if Motion is already installed.

Use Motion for:

* Page transitions
* Component entrances
* Exits
* Hover interactions
* Press states
* Dropdowns
* Modals
* Tooltips
* Layout transitions
* Staggered lists
* Sidebar transitions
* Tabs
* Accordions
* Notifications
* Micro-interactions

---

# 14. MOTION PRINCIPLES

Animations should generally feel:

* Fast
* Smooth
* Natural
* Physical
* Intentional

Prefer spring-based animation where it improves interaction quality.

Avoid unnecessarily long transitions.

Avoid excessive bouncing.

Avoid animations that delay the user's task.

Animation should generally support the user's action rather than interrupt it.

---

# 15. MICRO-INTERACTIONS

Interactive elements should provide appropriate feedback.

Examples:

Buttons:

* Hover
* Press
* Focus
* Disabled

Cards:

* Subtle hover response where appropriate

Navigation:

* Clear active state
* Smooth state transition

Forms:

* Validation feedback
* Loading state
* Success state
* Error state

Notifications:

* Smooth entrance
* Smooth dismissal

Do not animate every component simultaneously.

---

# 16. PAGE TRANSITIONS

Page transitions should be subtle.

Avoid cinematic transitions inside core business workflows.

Preferred approach:

* Small opacity changes
* Small vertical movement
* Layout-aware transitions
* Quick transitions

The user should feel that the application is fluid without consciously noticing the animation.

---

# 17. LOADING STATES

Never leave users staring at a frozen interface.

Use appropriate:

* Skeletons
* Spinners
* Progressive loading
* Optimistic UI where safe
* Disabled states
* Loading indicators

Prefer skeleton layouts that resemble the final content.

Avoid unnecessary full-screen loading screens.

---

# 18. EMPTY STATES

Every major data-driven screen should have a thoughtful empty state.

An empty state should answer:

1. What is empty?
2. Why is it empty?
3. What can the user do next?

Whenever appropriate provide:

* Short explanation
* Relevant icon/illustration
* Primary action

Avoid generic:

"No data found."

---

# 19. ERROR STATES

Errors must be understandable.

Never expose raw:

* Stack traces
* Database errors
* API errors
* Internal identifiers

Translate technical errors into useful user-facing messages.

Provide recovery actions whenever possible.

---

# 20. FORMS

Forms should be exceptionally clear.

Use:

* Clear labels
* Helpful descriptions
* Appropriate validation
* Inline errors
* Loading states
* Success feedback

Do not make users guess required fields.

Avoid excessive validation during typing unless it improves UX.

---

# 21. TABLES

HR software contains significant amounts of structured data.

Tables should prioritize:

* Scanability
* Alignment
* Density
* Sorting
* Filtering
* Search
* Pagination
* Clear row states
* Responsive behavior

Do not put every piece of information into a table.

Use progressive disclosure when appropriate.

---

# 22. DASHBOARDS

Dashboards should answer:

"What is happening?"

"What requires attention?"

"What should I do next?"

Avoid dashboards consisting only of decorative KPI cards.

Use:

* KPIs
* Trends
* Comparisons
* Alerts
* Recent activity
* Actionable insights
* Charts
* Tables

Data visualization should communicate information rather than decorate the page.

---

# 23. RESPONSIVE DESIGN

PeopleBind must work across:

* Desktop
* Laptop
* Tablet
* Mobile

Do not treat mobile as an afterthought.

Test:

* Navigation
* Tables
* Forms
* Modals
* Charts
* Sidebars
* Filters
* Dropdowns

Avoid horizontal overflow unless the component genuinely requires it.

---

# 24. ACCESSIBILITY

Follow accessible UI principles.

Ensure:

* Keyboard navigation
* Visible focus states
* Appropriate contrast
* Semantic HTML
* Accessible labels
* Accessible dialogs
* Accessible buttons
* Reduced-motion support

Respect:

prefers-reduced-motion

When reduced motion is enabled, substantially reduce or disable non-essential animations.

---

# 25. PERFORMANCE

Visual polish must never create a slow application.

Prioritize:

* Lazy loading
* Code splitting where appropriate
* Efficient rendering
* Avoiding unnecessary re-renders
* Optimized images
* Efficient animations
* GPU-friendly transforms
* Avoiding expensive layout calculations

Prefer transform/opacity animations where appropriate.

Do not create unnecessary animation loops.

---

# 26. ANIMATION PERFORMANCE

Prefer:

transform

opacity

scale

x/y translation

over expensive layout-changing animations when possible.

Avoid continuously animating:

width

height

top

left

unless there is a strong reason.

Use layout animations intelligently.

---

# 27. DATA & SUPABASE

PeopleBind uses Supabase.

Do not modify:

* Database schema
* RLS policies
* Authentication
* Queries
* Database functions

without first understanding how the current system works.

Protect:

* Tenant isolation
* User permissions
* Role-based access
* Data integrity

Never expose private Supabase credentials in frontend code.

Never hard-code secrets.

---

# 28. MULTI-TENANCY

PeopleBind is a SaaS application.

Always consider tenant isolation.

Data belonging to Organization A must never become visible to Organization B.

When implementing:

* Employees
* Payroll
* Attendance
* Leave
* Documents
* Reports
* Settings
* Managers
* Roles

ensure the correct organization context is respected.

---

# 29. SECURITY

Never:

* Expose secrets
* Hard-code API keys
* Bypass authorization
* Trust client-side permissions
* Disable RLS for convenience
* Log sensitive information unnecessarily

If a requested feature requires a security-sensitive change, inspect the existing architecture first.

---

# 30. CODE QUALITY

Write code that another developer can understand.

Prefer:

* Small components
* Clear names
* Reusable utilities
* Predictable state management
* Typed interfaces
* Minimal duplication

Avoid:

* Giant components
* Deeply nested conditionals
* Duplicate logic
* Unused imports
* Dead code
* Temporary hacks

Do not optimize prematurely.

---

# 31. TYPESCRIPT

Prefer strong typing.

Avoid:

any

unless there is a legitimate reason.

Define appropriate:

* Interfaces
* Types
* Props
* API response types
* Database types

Use Supabase-generated types where appropriate.

---

# 32. BEFORE CHANGING A PAGE

Before modifying an existing page:

1. Inspect the page.
2. Identify its components.
3. Identify its data sources.
4. Identify its routes.
5. Identify its state.
6. Identify reusable components.
7. Identify existing styling.
8. Identify potential regressions.

Then make the smallest change that achieves the desired result.

---

# 33. BEFORE ADDING A DEPENDENCY

Ask:

1. Do we already have a library that solves this?
2. Can this be implemented using existing dependencies?
3. Does this dependency meaningfully improve the product?
4. Does it increase bundle size significantly?
5. Is it actively maintained?

Do not install dependencies simply because they are popular.

---

# 34. DESIGN CONSISTENCY

When adding a new module, it must look like it belongs to PeopleBind.

Reuse:

* Typography
* Colors
* Buttons
* Inputs
* Cards
* Tables
* Modals
* Navigation
* Icons
* Spacing
* Animation language

Do not create a new visual language for every module.

---

# 35. MODULES

PeopleBind may contain modules such as:

* Dashboard
* Employees
* Attendance
* Leave
* Payroll
* Performance
* Recruitment
* Documents
* Reports
* Expenses
* Settings
* Organization
* Notifications

Each module should feel like part of the same operating system.

---

# 36. INTERACTION QUALITY

For every important interaction ask:

"What does the user see immediately after clicking?"

Examples:

Button click:

→ visual press feedback

API request:

→ loading state

Successful operation:

→ confirmation

Failed operation:

→ useful error

Navigation:

→ smooth transition

Delete action:

→ confirmation where appropriate

Save action:

→ clear saved state

This creates a responsive and trustworthy product.

---

# 37. DO NOT OVER-ANIMATE

Avoid:

* Constant floating elements
* Infinite icon animations
* Excessive parallax
* Excessive bouncing
* Long page transitions
* Animating every card
* Animating every number
* Excessive hover effects
* Distracting background animations

Premium design is often defined by what is NOT animated.

---

# 38. VISUAL DETAILS

Pay attention to:

* 1px alignment differences
* Icon alignment
* Button height
* Border radius consistency
* Text baseline
* Line height
* Table row height
* Input spacing
* Modal positioning
* Dropdown positioning
* Shadow intensity
* Hover states
* Focus states
* Empty states
* Loading states

Small details create perceived quality.

---

# 39. AI-GENERATED DESIGN CHECK

Before considering a UI change complete, ask:

"Does this look like an AI-generated SaaS dashboard?"

If yes:

* simplify
* refine
* reduce decoration
* improve hierarchy
* improve spacing
* improve typography
* make interactions more intentional

---

# 40. IMPLEMENTATION WORKFLOW

For significant UI work:

STEP 1 — Inspect

Understand the current implementation.

STEP 2 — Plan

Identify the minimum required changes.

STEP 3 — Implement

Use existing architecture and components.

STEP 4 — Animate

Add Motion only where it improves UX.

STEP 5 — Validate

Check functionality.

STEP 6 — Responsive review

Check desktop, tablet and mobile.

STEP 7 — Accessibility review

Check keyboard, focus and reduced motion.

STEP 8 — Visual polish

Fix spacing, alignment, typography and micro-interactions.

STEP 9 — Cleanup

Remove unused code and dependencies.

---

# 41. WHEN USING FIGMA

When Figma is available:

1. Inspect the Figma design.
2. Identify design tokens.
3. Identify reusable components.
4. Map Figma components to PeopleBind components.
5. Reuse existing PeopleBind architecture.
6. Implement the design faithfully.
7. Do not blindly generate duplicate components.

Figma is a design reference, not permission to destroy the existing application architecture.

---

# 42. WHEN USING MOTION

Use Motion as the primary React animation framework.

Prefer simple composable animations.

Example:

import { motion } from "motion/react"

Use:

* initial
* animate
* exit
* whileHover
* whileTap
* layout
* variants

where appropriate.

Keep animation definitions readable.

Avoid putting complicated animation logic directly into every component.

Create reusable motion variants when patterns repeat.

---

# 43. REUSABLE MOTION PATTERNS

Create reusable animation patterns for common interactions such as:

* fadeIn
* slideIn
* scaleIn
* staggerChildren
* pageTransition
* modalTransition
* dropdownTransition
* toastTransition

Do not duplicate identical animation configurations across dozens of files.

---

# 44. MARKETING VS APPLICATION UI

Differentiate between:

APPLICATION

and

MARKETING WEBSITE.

Application:

* Functional
* Dense
* Fast
* Subtle animation
* Productivity-focused

Marketing:

* More expressive
* More animation
* More storytelling
* More visual experimentation

Do not bring marketing-level animation into productivity workflows unnecessarily.

---

# 45. HYPERFRAMES

Hyperframes should be considered a marketing/video tool rather than the primary PeopleBind UI animation framework.

Use Hyperframes for:

* Product launch videos
* Feature demos
* SaaS promotional videos
* Animated product walkthroughs
* Social media videos
* Landing-page video assets

Do not use Hyperframes as a replacement for Motion inside the application.

---

# 46. TESTING

Before declaring a feature complete:

Check:

* Existing functionality
* Console errors
* TypeScript errors
* Build errors
* Broken routes
* Broken API calls
* Broken forms
* Mobile layout
* Keyboard navigation
* Animation behavior
* Reduced-motion behavior

Do not claim something is complete if it has not been validated.

---

# 47. CHANGE MANAGEMENT

For large changes:

Explain internally:

* What is being changed
* Why
* Which files are affected
* What could break

Avoid unrelated refactoring during feature work.

Do not modify unrelated modules unless necessary.

---

# 48. NEVER FAKE FUNCTIONALITY

Do not create fake:

* API responses
* Database records
* Analytics
* Payroll calculations
* Employee information
* Authentication states

unless explicitly requested for development/demo purposes.

If something is not implemented, do not pretend that it is.

---

# 49. FINAL QUALITY STANDARD

Before considering a PeopleBind feature finished, ask:

### FUNCTION

Does it work?

### UX

Is it intuitive?

### DESIGN

Does it look premium?

### CONSISTENCY

Does it belong to PeopleBind?

### MOTION

Does animation improve the experience?

### PERFORMANCE

Is it fast?

### RESPONSIVENESS

Does it work on different screen sizes?

### ACCESSIBILITY

Can different users interact with it?

### SECURITY

Is user and tenant data protected?

### MAINTAINABILITY

Can another developer understand the code?

All ten should be considered before completion.

---

# 50. GOLDEN RULE

PeopleBind should feel like a product that was designed by a strong product team, not generated by an AI coding assistant.

Prioritize:

CLARITY > DECORATION

USEFULNESS > NOVELTY

CONSISTENCY > COMPLEXITY

SUBTLETY > EXCESSIVE ANIMATION

PERFORMANCE > VISUAL EFFECTS

QUALITY > SPEED

When uncertain, choose the simpler, more intentional solution.

---

# 51. DEFAULT BEHAVIOR FOR CLAUDE CODE

When asked to improve PeopleBind:

DO NOT immediately start rewriting.

First inspect.

Then understand.

Then plan.

Then implement.

Then validate.

Then polish.

Preserve existing functionality unless explicitly instructed otherwise.

Always prioritize the long-term quality of the PeopleBind product over short-term visual changes.
