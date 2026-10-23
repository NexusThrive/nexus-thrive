> **Paso 0 — va antes de todo lo demás.** Rediseño del sistema aplicando este
> mandato, antes de los pasos A–C de [`docs/PENDIENTES.md`](docs/PENDIENTES.md).
> Aún no ejecutado. Documento original, sin cambios.

# NEXUS — Unified Design System, Enterprise UX, Accessibility & Motion Engineering

## 0. MISSION

You are responsible for establishing, implementing, documenting, and continuously enforcing the unified design and interaction system of NEXUS.

Act as a coordinated team of:

- Principal Product Designer.
- Senior Design Systems Engineer.
- Enterprise SaaS UX Architect.
- Senior Frontend Engineer.
- Accessibility Engineer.
- Motion Design Engineer.
- Frontend QA and Visual Regression Engineer.

NEXUS is an evolving business operating platform. It includes a public marketing website, a CEO administration panel, company workspaces, business modules, forms, dashboards, and contextual documentation.

The goal is not to create a new visual identity. The goal is to make the existing NEXUS identity consistent, professional, accessible, understandable, responsive, and technically sustainable throughout the entire ecosystem.

**You must implement the improvements in the actual codebase. Do not stop at recommendations, mockups, documentation, or a proposed plan.**

Inspect first, plan the work, implement it incrementally, test it, fix the findings, and report what is genuinely complete.

The system must continue following these rules whenever new features, modules, screens, forms, or interactions are created or modified.

---

# 1. NON-NEGOTIABLE: PRESERVE THE NEXUS BRAND

The NEXUS brand already exists in the source code.

Before changing anything, discover and document:

- Brand colors and semantic color tokens.
- Typography, font hierarchy, and font weights.
- Logo, icons, imagery, and established visual assets.
- Existing design tokens, CSS variables, Tailwind configuration, and theme configuration.
- Shared components and their variants.
- Layout conventions, spacing, radii, borders, and shadows.
- Existing animation patterns and installed dependencies.
- Dark and light theme behavior, if supported.
- Existing desktop, tablet, and mobile behavior.

Preserve the recognizable NEXUS identity.

Do not replace the existing design with a generic AI-generated SaaS template. Do not introduce unrelated gradients, colors, typography, glass effects, component styles, or animation aesthetics.

Improve existing decisions before introducing new ones.

If a foundational design change is necessary, explain why, evaluate its impact, and keep the change consistent across the entire ecosystem.

Do not delete working components or replace real product functionality simply to make a screen easier to redesign.

---

# 2. USE EACH TOOL FOR A SPECIFIC PURPOSE

Use the following references as specialized sources of design and engineering guidance.

## 2.1 Impeccable — primary design workflow

Reference: https://impeccable.style/

Use Impeccable as the primary interface quality and design refinement workflow.

Use the appropriate commands when available:

- `/impeccable init`: establish product context and design goals.
- `/impeccable audit`: find and prioritize implementation problems.
- `/impeccable critique`: assess clarity, visual hierarchy, and design quality.
- `/impeccable document`: record the verified visual system in DESIGN.md.
- `/impeccable extract`: identify and consolidate reusable UI patterns.
- `/impeccable layout`: improve spacing, composition, and hierarchy.
- `/impeccable typeset`: improve typography and readability.
- `/impeccable animate`: implement purposeful motion.
- `/impeccable adapt`: refine responsive behavior.
- `/impeccable clarify`: improve confusing interactions and interface copy.
- `/impeccable harden`: handle edge cases and production readiness.
- `/impeccable optimize`: investigate performance issues.
- `/impeccable polish`: perform the final consistency and quality pass.
- `/impeccable onboard`: improve first-use and empty-state experiences.

Run commands against specific pages or components whenever possible.

Do not execute every command indiscriminately. Choose the appropriate command for the problem being addressed.

If a command is unavailable, inspect the installed integration and use the documented equivalent. Never pretend a tool ran when it did not.

## 2.2 Mobbin — product and interaction references

Reference: https://mobbin.com/

Use Mobbin to research how mature applications organize:

- Navigation and information architecture.
- Dashboards and business metrics.
- Search, filters, and data tables.
- Settings and account management.
- Onboarding and multistep flows.
- Dialogs, drawers, and contextual actions.
- Empty states and user feedback.

Extract principles and patterns. Do not copy another product's identity or assume its behavior is automatically right for NEXUS.

## 2.3 SaaSUI — business application patterns

Reference: https://www.saasui.design/

Use it to inform the structure of administrative interfaces, settings, billing-like flows, business dashboards, and operational screens.

Prioritize clarity, information density, predictable interactions, and consistency.

## 2.4 shadcn/ui and Radix UI — component behavior

References:

- https://ui.shadcn.com/
- https://www.radix-ui.com/primitives

Inspect the current component infrastructure before making decisions.

Use these references to improve accessible dialogs, popovers, tooltips, menus, selects, forms, and other interactive components where appropriate.

Do not migrate the entire project to a different component library simply because a reference uses it.

Preserve the existing stack and reuse existing primitives wherever possible.

## 2.5 Motion for React — animation engineering

Reference: https://motion.dev/docs/react

Use Motion for React only when it provides a clear advantage over existing CSS transitions or animation infrastructure.

Define a unified motion system rather than implementing unrelated animations in individual components.

Use it for meaningful transitions, layout changes, expandable panels, and interaction feedback when appropriate.

Respect reduced-motion preferences and performance constraints.

## 2.6 W3C WAI-ARIA Authoring Practices — accessibility

Reference: https://www.w3.org/WAI/ARIA/apg/patterns/

Use this as the primary reference for accessible interaction patterns, including:

- Modal dialogs.
- Buttons and disclosure controls.
- Tooltips.
- Menus and comboboxes.
- Keyboard navigation.
- Focus behavior.
- Accessible names, descriptions, and states.

Follow semantic HTML first. ARIA supplements correct HTML; it does not replace it.

## 2.7 Playwright — browser and visual verification

Reference: https://playwright.dev/

Use Playwright if compatible with the repository to verify real user workflows, navigation, form submission, dialogs, responsive layouts, and important interaction states.

Create or extend automated tests around the shared design system and critical business workflows.

## 2.8 axe-core — accessibility testing

Reference: https://github.com/dequelabs/axe-core

Use automated accessibility checks where they can be integrated reliably.

Automated checks are necessary but insufficient. Also verify keyboard navigation, focus management, semantic structure, readable content, and important screen-reader interactions.

## 2.9 Storybook — component system and state coverage

Reference: https://storybook.js.org/

Evaluate Storybook if the project has enough shared components to benefit from an isolated component catalogue.

If useful, document components and their meaningful states: default, hover, focus, disabled, loading, success, error, empty, and responsive variants.

Do not introduce Storybook solely for decoration or if its maintenance cost is unjustified.

## 2.10 Lighthouse — quality and performance

Reference: https://developer.chrome.com/docs/lighthouse/

Use Lighthouse or equivalent available tools to evaluate accessibility, performance, and best practices.

Record real results where available. Do not fabricate scores or claim a perfect accessibility rating based on a single automated scan.

### Tool integration rule

Before installing any package or integration:

1. Inspect the existing dependencies and versions.
2. Check whether the capability already exists.
3. Verify compatibility with the current framework.
4. Choose the smallest effective toolset.
5. Explain the value of any new dependency.
6. Avoid duplicate libraries that solve the same problem.

The objective is a reliable engineering workflow, not the largest possible dependency list.

---

# 3. ESTABLISH A PERMANENT DESIGN SYSTEM

Create or update the following project documents, using the existing documentation structure if one is already established:

- `DESIGN.md`: brand tokens, typography, spacing, component variants, layout rules, and motion conventions.
- `PRODUCT.md`: audience, purpose, product principles, and important constraints.
- `docs/design/interaction-patterns.md`: when to use each interaction pattern.
- `docs/design/accessibility.md`: accessibility requirements and verification procedures.
- `docs/design/quality-checklist.md`: mandatory checks for new and modified UI.

Do not create duplicate documents if equivalent ones already exist. Consolidate and improve the existing documentation.

## 3.1 Design tokens

Define a coherent token system for:

- Brand and semantic colors.
- Typography.
- Spacing.
- Component dimensions.
- Content widths.
- Border radii.
- Borders and shadows.
- Elevation layers.
- Focus indicators.
- Z-index layers.
- Animation durations and easing.
- Breakpoints and responsive behavior.

Use the existing token implementation as the source of truth.

If a token is missing, add it consistently instead of introducing isolated hardcoded values throughout the application.

## 3.2 Component ownership

Establish a clear distinction between:

- Global design tokens.
- Primitive UI components.
- Composite components.
- Feature-specific components.
- Page layouts.
- Business logic and data access.

Place reusable components in the repository's existing conventions.

Avoid duplicating the same dialog, button, form field, tooltip, drawer, or feedback component in separate modules.

A shared component must have a clear contract, predictable behavior, documented variants, and accessible defaults.

## 3.3 Design-system enforcement

DESIGN.md must be treated as an active engineering specification, not a document that is written once and forgotten.

Whenever a new feature is created:

1. Read the applicable design rules.
2. Reuse existing components and tokens.
3. Follow the interaction-pattern decision rules.
4. Implement all relevant states and accessibility requirements.
5. Run the appropriate checks.
6. Update documentation if the system itself changes.

Use Impeccable hooks and automated checks when available and compatible with the repository.

Do not rely solely on Claude's memory or on the developer remembering to follow the rules.

---

# 4. UNIFY THE INTERACTION ARCHITECTURE

A major priority is eliminating inconsistent interaction patterns.

The problem is not simply that a form is outside a modal. The problem is that the same type of operation behaves differently across the application without a clear reason.

Establish a documented interaction decision system and apply it consistently to the CEO panel, company workspaces, and future modules.

## 4.1 Required interaction types

Implement and standardize the following patterns where appropriate.

### A. Modal dialog

Use for focused tasks that temporarily interrupt the current workflow.

Examples:

- Quick creation of a record.
- Editing a small set of fields.
- Confirming a destructive action.
- Viewing a concise detail or making a quick assignment.
- Short operations that do not require a complete page.

Requirements:

- Clear title and purpose.
- Appropriate description when needed.
- Consistent sizing.
- Correct focus management.
- Keyboard navigation.
- Escape behavior when safe.
- Focus restoration after closing.
- Background interaction blocked when the dialog is modal.
- Clear close, cancel, and submit actions.
- Loading, validation, success, and error states.

Do not nest dialogs without a compelling reason.

### B. Right-side drawer

Use a side panel when the user must preserve context while working on more substantial content.

Examples:

- Creating or editing a business record with several fields.
- Viewing a customer or company detail.
- Configuring a module.
- Editing a structured record with contextual information.
- Inspecting activity, metadata, or related entities.

The drawer should preserve the underlying page context and have consistent width rules, scrolling, actions, and responsive behavior.

On narrow screens, adapt it to a usable full-screen or near-full-screen experience.

A drawer that blocks background interaction must behave as a modal dialog. A nonmodal side panel must have an explicitly different interaction contract.

### C. Floating modal or compact popover

Use a compact floating surface for contextual, lightweight interactions.

Examples:

- Quick actions.
- Small contextual forms.
- Selecting a small number of options.
- Additional information related to a specific control.
- Compact action menus.

Do not use a floating popover for long forms, complex navigation, or essential content that becomes difficult to access on mobile.

If the floating surface contains multiple interactive controls or a larger workflow, evaluate whether a dialog or drawer is more appropriate.

### D. Dedicated page

A dedicated page is still valid when it is the best experience.

Use a page for:

- Complex onboarding.
- Long forms with multiple steps.
- Large configuration workflows.
- Full-screen editors.
- Tasks requiring substantial content, navigation, or contextual explanation.
- Operations that benefit from direct linking, browser history, or a dedicated route.

Do not force every form into a modal. The objective is consistent, intentional behavior rather than making the entire application modal-dependent.

### E. Inline editing and disclosure

Inline interaction is appropriate for small, low-risk changes that benefit from immediate context, such as editing a simple label or expanding a section.

Do not leave a substantial form embedded in a page without an intentional interaction model.

## 4.2 Mandatory rule for existing forms

Audit every form across the application.

For each form, determine whether it is:

- A quick create/edit operation that should open in a modal.
- A contextual record workflow that should use a right-side drawer.
- A compact action suitable for a floating surface.
- A complex workflow that deserves its own page.
- A genuinely simple inline interaction.

Migrate inconsistent forms to the appropriate shared pattern.

Every action that opens a form must have a clear and predictable behavior.

Eliminate accidental inline forms, uncontrolled popups, forms that appear in arbitrary positions, and inconsistent close or save behavior.

Do not remove a form or its functionality during migration.

Preserve validation, submission logic, permissions, data persistence, and error recovery.

## 4.3 Create an interaction decision matrix

Document the rules in `docs/design/interaction-patterns.md`.

For each pattern, define:

- Appropriate use cases.
- When not to use it.
- Desktop behavior.
- Mobile behavior.
- Keyboard behavior.
- Focus rules.
- Scrolling behavior.
- Animation rules.
- Loading and error handling.
- Examples from the actual NEXUS application.

Use this decision matrix whenever a new interaction is designed.

## 4.4 Create a shared interaction layer

Where the current architecture supports it, consolidate reusable primitives such as:

- `Dialog`
- `Drawer`
- `Popover`
- `Tooltip`
- `FormDialog`
- `FormDrawer`
- `ConfirmDialog`
- `ContextHelp`
- `FormField`
- `FieldDescription`
- `FieldError`
- `EmptyState`
- `LoadingState`
- `Toast` or the existing notification equivalent

These are conceptual names, not instructions to create duplicate files blindly. Reuse and extend the existing implementations first.

Feature-specific components should compose the shared primitives instead of independently recreating modal behavior.

---

# 5. ACCESSIBILITY MUST BE BUILT INTO EVERY COMPONENT

Target WCAG 2.2 Level AA as the design and verification baseline.

Do not claim full compliance without an appropriately scoped evaluation.

Accessibility is not a final polish step. It is a permanent implementation requirement.

## 5.1 Semantic structure

Use appropriate HTML elements and meaningful heading hierarchy.

Use buttons for actions and links for navigation.

Provide accessible names and descriptions for inputs, controls, icons, and interactive elements.

Avoid unnecessary ARIA attributes and custom widgets when native HTML provides the correct behavior.

## 5.2 Keyboard access

Verify that:

- All interactive functionality can be reached and operated with a keyboard.
- Focus is clearly visible.
- Focus order is logical.
- Focus is not trapped accidentally.
- Modal dialogs and drawers manage focus correctly.
- Escape closes dismissible overlays where appropriate.
- Focus returns to the triggering control after a dialog closes.
- Menus and other composite widgets follow their appropriate keyboard patterns.

## 5.3 Tooltips and small question-mark icons

Every small `?` help control must be intentional, discoverable, and accessible.

Implement a consistent `ContextHelp` pattern for explanatory information.

Requirements:

- Give the trigger an accessible name, such as "Ayuda sobre el correo electrónico".
- A pointer hover may display a tooltip, but hover must not be the only way to access the information.
- Support keyboard focus.
- Support touch devices through an appropriate tap interaction.
- Associate the explanatory text with its trigger using appropriate accessibility relationships.
- Keep the text readable and positioned within the viewport.
- Avoid clipping inside cards, drawers, tables, or scroll containers.
- Provide a dismissible behavior and sensible timing.
- Do not put focusable controls inside a basic tooltip.
- If the help content needs links, buttons, or other interactive elements, use a suitable popover or nonmodal dialog instead.
- Ensure help remains available at relevant zoom levels and viewport sizes.

For fields, distinguish between persistent descriptions and supplementary help. Important instructions must not exist only inside a transient tooltip.

Use concise, specific Spanish explanations that tell users what a field means, what information is expected, and how that information will be used when relevant.

## 5.4 Forms and validation

Every form field must have:

- A programmatically associated label.
- Clear instructions when needed.
- An accessible validation message.
- A distinguishable error state that does not depend on color alone.
- Correct required and optional indicators.
- Appropriate input types and autocomplete attributes.
- Keyboard-accessible controls.
- Predictable focus behavior when validation fails.

When submission fails, identify the problem and help the user correct it.

When submission succeeds, provide clear confirmation without unexpectedly losing the user's context.

Do not erase entered information after recoverable errors.

## 5.5 Color, contrast, typography, and scaling

Verify text contrast, component boundaries, focus indicators, and state differentiation against WCAG 2.2 AA criteria.

Respect text resizing and browser zoom.

Avoid fixed-height layouts that clip translated text, validation messages, or enlarged content.

Support narrow screens without horizontal overflow in ordinary content.

Use sufficiently large interaction targets, especially for icon-only controls and mobile interfaces. Apply WCAG target-size requirements and exceptions correctly rather than assuming that every control must have one universal dimension.

## 5.6 Screen readers and announcements

Use appropriate accessible names, descriptions, roles, and states.

Announce important asynchronous feedback where appropriate, including submission results and relevant validation errors.

Do not overwhelm screen readers with redundant announcements.

## 5.7 Reduced motion

Respect `prefers-reduced-motion`.

Keep essential state changes understandable when animations are reduced or disabled.

Avoid flashing, excessive movement, and transitions that interfere with interaction.

---

# 6. CREATE A COHERENT MOTION SYSTEM

Use `/impeccable animate` and the existing animation infrastructure to establish shared motion rules.

Document these rules in DESIGN.md.

Define:

- Short feedback transitions.
- Standard overlay transitions.
- Drawer entry and exit.
- Page-level transitions, when justified.
- Layout changes.
- Loading indicators.
- Success and error feedback.
- Hover, focus, and press states.
- Reduced-motion alternatives.

Use a small, consistent set of durations and easing functions derived from the actual product requirements.

Animate to explain a state change, establish continuity, or confirm an action.

Do not animate every component independently.

Avoid excessive stagger, large decorative movement, gratuitous parallax, unnecessary scaling, layout thrashing, and animation that delays essential actions.

For dialogs and drawers:

- The opening and closing behavior must be consistent.
- Content must remain readable throughout the transition.
- Closing must not be delayed unnecessarily.
- Rapid repeated interactions must not break component state.
- Focus and accessibility behavior must remain correct during transitions.

Use CSS for simple transitions. Use Motion for React when more advanced layout, gesture, or interruptible animation behavior justifies the dependency.

Do not install multiple competing animation libraries.

---

# 7. RESTRUCTURE THE CEO PANEL

The CEO panel must become coherent as an operational overview of NEXUS.

First, inspect all routes, screens, navigation items, metrics, tables, actions, and existing data sources.

Identify features that are misplaced, duplicated, confusing, disconnected from their purpose, or visually inconsistent.

Organize the interface according to the CEO's actual responsibilities and workflows, not according to the current accidental arrangement of components.

Evaluate and organize areas such as:

- Business and organization overview.
- Companies and registered users.
- Product modules and feature availability.
- Automations and operational status.
- Relevant platform metrics.
- Recent activity and operational alerts.
- Administrative tasks and configuration.
- Access, roles, and permissions.

These are candidates to evaluate, not an instruction to create every section regardless of need.

For each metric, verify its definition, source, update behavior, and usefulness.

Do not invent data, display misleading statistics, or make nonfunctional controls appear operational.

Separate high-priority information from secondary analytics.

Avoid redundant KPI cards, excessive nested cards, duplicated navigation, and irrelevant metrics.

Make it clear which actions are global platform operations and which belong to an individual company.

Preserve existing permissions and authorization boundaries.

The CEO panel must feel like a coherent administrative product rather than a collection of unrelated screens.

---

# 8. RESTRUCTURE COMPANY WORKSPACES

The company experience must prioritize the daily operation of a business.

Inspect how users enter their workspace, navigate modules, create records, access customer information, configure their organization, and understand available features.

Organize the experience around real workflows and the modules enabled for that company.

Evaluate the following areas where they exist or are justified:

- Business overview.
- Customers and CRM.
- Sales and transactions.
- Services, products, or memberships.
- Automations.
- Company presence and digital channels.
- Reports and analytics.
- Settings, members, and permissions.
- Help and contextual guidance.

Do not add unnecessary navigation sections just to fill a sidebar.

Avoid mixing company-specific information with global platform administration.

Ensure disabled or unavailable modules have understandable states and do not expose unauthorized operations.

Standardize page headers, primary actions, filters, tables, forms, empty states, and feedback across all relevant modules.

If multiple modules share the same type of operation, reuse the same interaction pattern.

A user should not have to relearn how to create, edit, search, or confirm an operation in each section.

Preserve the current backend contracts and actual feature capabilities.

---

# 9. UNIFY THE MARKETING WEBSITE AND THE APPLICATION

The public website is:

https://nexusthrive.com.co/

The application has a help and documentation destination:

https://nexusthrive.com.co/help

Inspect the actual deployed experience and the local source code. Verify the available routes and assets rather than assuming the URL structure or content.

The public website and the authenticated application must share the same verified NEXUS brand identity.

They have different purposes:

- The public website explains the product, communicates its value, and helps visitors understand why NEXUS is useful.
- The application helps people complete operational tasks.
- The help center teaches people how to use the real product.

They should look like parts of the same ecosystem without forcing the marketing layout into the operational dashboard.

## 9.1 Help center

Build or refine the help center so users can understand:

- What NEXUS is.
- How the application is organized.
- What each relevant module does.
- How to perform common tasks.
- What the important fields mean.
- How the CEO panel differs from a company workspace, where relevant.
- What users should expect when completing important operations.

Use screenshots captured from the actual NEXUS interface.

Do not fabricate screenshots, invent features, or document workflows that do not exist.

Capture representative screens using the available browser automation or screenshot tooling. Use sanitized demo data and remove personal, customer, authentication, and other sensitive information.

For each guide, include when appropriate:

- Purpose.
- Prerequisites.
- Step-by-step instructions.
- Annotated screenshots or focused visual references.
- Expected result.
- Common errors and recovery steps.
- Relevant links to related documentation.

Organize documentation by task, module, and audience rather than publishing one long unstructured page.

## 9.2 Contextual help inside the application

Where users may not understand a field, setting, or operation, provide a contextual `?` help control or a persistent description when that is more appropriate.

Use the same shared help component everywhere.

Where useful, link to the corresponding help-center guide.

Avoid adding a help icon to every label when it adds no value.

Important instructions must remain discoverable without hover.

## 9.3 Documentation accuracy

Whenever a user-facing feature or workflow changes:

1. Identify the affected help documentation.
2. Update its instructions.
3. Refresh affected screenshots.
4. Verify that the documented behavior matches the implementation.
5. Check that links remain valid.

The help center must evolve with the product rather than becoming outdated after each release.

---

# 10. RESPONSIVE DESIGN AND REAL DEVICE CONDITIONS

Verify the experience across representative desktop, tablet, and mobile viewport sizes.

Use responsive rules based on the content and interaction requirements.

Check:

- Navigation and sidebars.
- Tables and dense information.
- Long forms.
- Dialogs and drawers.
- Tooltips and popovers.
- Charts and metrics.
- Sticky headers and footers.
- Browser zoom and text resizing.
- Touch targets.
- Long labels and translated text.
- Horizontal overflow.

Do not simply shrink desktop screens to fit mobile.

Adapt navigation, information density, content hierarchy, and interaction patterns to the available space.

On mobile, use full-screen dialogs or other appropriate layouts when a centered desktop modal would become cramped.

Do not hide essential functionality merely to make the layout look clean.

---

# 11. EVERY NEW FEATURE MUST FOLLOW THIS STANDARD

This is a permanent rule for all future work in the repository.

Whenever a new feature, component, page, module, or form is created or modified, follow this sequence.

### Before implementation

1. Understand the user's task and the feature's purpose.
2. Inspect existing components and design tokens.
3. Identify similar interactions already implemented.
4. Choose the correct page, dialog, drawer, popover, or inline pattern.
5. Identify accessibility requirements and interaction states.
6. Identify relevant help documentation.
7. Consider loading, empty, error, success, and permission states.

### During implementation

1. Reuse existing components and tokens.
2. Follow the documented information architecture.
3. Use accessible semantic markup.
4. Implement keyboard, focus, and touch behavior.
5. Apply the shared motion system when motion is useful.
6. Preserve backend behavior and permissions.
7. Add or update tests where appropriate.
8. Avoid creating duplicate implementations of existing patterns.

### After implementation

1. Run the relevant linting and type checks.
2. Run applicable tests.
3. Verify the feature in a browser where tooling permits.
4. Check responsive behavior.
5. Run relevant accessibility checks.
6. Inspect console errors and network failures.
7. Update help documentation if user-facing behavior changed.
8. Run the appropriate Impeccable audit or polish workflow.
9. Fix discovered issues before declaring completion.

Do not skip accessibility because a feature is small.

Do not skip visual consistency because a feature is primarily backend-driven.

Do not add animations simply to satisfy a checklist.

Do not claim completion without evidence.

---

# 12. AUTOMATED QUALITY GATES

Inspect the repository's scripts, CI, and testing infrastructure before changing them.

Establish the most useful automated checks the current project can support.

Evaluate:

- TypeScript checks.
- Linting.
- Existing unit and integration tests.
- Production builds.
- Playwright end-to-end tests.
- axe-core accessibility scans.
- Visual regression tests where justified.
- Responsive screenshots.
- Impeccable automated checks or hooks.
- Lighthouse audits where appropriate.

Prioritize tests for shared primitives and high-impact workflows.

At minimum, verify critical interaction scenarios such as:

- Opening and closing a modal.
- Opening and closing a drawer.
- Submitting a valid form.
- Handling invalid form data.
- Handling a failed submission.
- Keyboard navigation and focus restoration.
- Reduced-motion behavior.
- Mobile overlay behavior.
- Access restrictions in administrative and company contexts.

Where visual regression testing is introduced, use stable test data and predictable rendering. Avoid brittle snapshots that fail because of irrelevant dynamic content.

Do not disable tests, accessibility rules, type checks, or linting merely to obtain a passing result.

If an automated check cannot run, report why and specify the remaining manual verification.

---

# 13. IMPLEMENTATION STRATEGY: EXECUTE THE WORK COMPLETELY

Work incrementally, but do not stop after producing the initial audit.

## Phase 1 — Repository discovery

Inspect the repository structure, framework, dependencies, routes, shared components, themes, design tokens, tests, and current documentation.

Identify whether the public website and application live in one repository or multiple repositories.

Do not assume every referenced project is present in the current workspace.

## Phase 2 — Baseline and audit

Run the available Impeccable audit and inspect the CEO panel, company workspaces, existing forms, overlays, contextual help, and responsive layouts.

Record findings by severity and affected areas.

Identify existing functionality that must be preserved.

## Phase 3 — Architecture and standards

Document the design system, interaction decision matrix, accessibility standards, and reusable component strategy.

Implement only the abstractions that provide real value.

## Phase 4 — Shared component foundation

Fix the most important shared primitives first.

Standardize dialogs, drawers, popovers, tooltips, form fields, validation, notifications, empty states, and loading states where these patterns are needed.

Verify these primitives before migrating dependent features.

## Phase 5 — CEO and company experience

Correct the information architecture, confusing layouts, inconsistent forms, redundant components, and unclear actions.

Work through the existing application systematically.

Preserve data flows, permissions, and business logic.

## Phase 6 — Public website and help center

Align the public website and help center with the same design system.

Use authentic product screenshots and maintain accurate documentation.

## Phase 7 — Motion and accessibility

Apply coherent animations, keyboard behavior, semantic markup, contrast improvements, reduced-motion support, and responsive interaction patterns across the relevant screens.

## Phase 8 — Verification and remediation

Run the available automated checks, test important user workflows, inspect the UI in the browser, and fix findings.

Repeat the relevant audits after significant changes.

## Phase 9 — Permanent enforcement

Make the design rules discoverable to future coding sessions and automated workflows.

Update the project's relevant instructions, such as `CLAUDE.md`, without overwriting unrelated project guidance.

Ensure future features inherit the design system, interaction patterns, accessibility standards, and documentation expectations.

---

# 14. IMPORTANT ENGINEERING CONSTRAINTS

- Inspect before editing.
- Keep changes focused and reviewable.
- Preserve existing brand identity.
- Preserve authentication, authorization, routing, data persistence, and business logic.
- Do not invent APIs, data, metrics, routes, or product capabilities.
- Do not rewrite unrelated modules.
- Do not install dependencies without justification.
- Do not duplicate existing components.
- Do not create nonfunctional controls.
- Do not replace real application data with mock data.
- Do not expose sensitive information in screenshots or documentation.
- Do not ignore accessibility failures because the UI looks good.
- Do not assume an animation is performant without checking its implementation and behavior.
- Do not claim a test passed unless it was actually executed.
- Use the repository's existing conventions and package manager.
- Preserve unrelated user changes in the working tree.
- Never discard uncommitted changes as part of this task.
- If an operation is destructive or could alter production data, stop and obtain explicit authorization.
- If an external website cannot be inspected, report the limitation and continue with the available source code.
- If a decision genuinely blocks safe implementation, ask a focused question. Otherwise, make a reasoned decision and proceed.

Do not attempt to redesign every screen in a single uncontrolled change.

Prefer a verified, incremental implementation that eventually covers the entire scope.

---

# 15. DEFINITION OF DONE

The work is complete only when:

1. The existing NEXUS identity is preserved and documented.
2. The shared design system is implemented and reusable.
3. Interaction patterns are documented and consistently applied.
4. Existing forms use intentional, predictable interaction patterns.
5. Modals, drawers, and popovers have coherent behavior.
6. Contextual help is accessible with pointer, keyboard, and touch as appropriate.
7. Keyboard navigation and focus management work across important workflows.
8. Motion is purposeful, consistent, and reduced-motion aware.
9. The CEO panel has a coherent information architecture.
10. Company workspaces have consistent navigation and interaction behavior.
11. The public website and application share the verified brand system.
12. The help center documents real product workflows with accurate screenshots.
13. New feature instructions and component patterns are documented.
14. Relevant automated checks pass, or remaining failures are explicitly reported.
15. Responsive behavior has been verified at representative viewport sizes.
16. No known high-severity issue introduced by this work remains unresolved.
17. Future development has a clear, enforceable process for following these standards.

A visually polished screenshot alone does not constitute completion.

---

# 16. REQUIRED FINAL REPORT

When implementation is complete, provide a concise but specific report containing:

- The architectural problems discovered.
- The design and interaction rules established.
- Shared components created or improved.
- CEO panel improvements.
- Company workspace improvements.
- Forms migrated to dialogs, drawers, popovers, or dedicated pages, with reasons.
- Accessibility improvements and checks performed.
- Animation system changes.
- Help center and screenshot updates.
- New tools or dependencies and their justification.
- Tests actually executed and their results.
- Remaining issues, limitations, and unverified areas.
- Relevant files changed.
- Any follow-up work that genuinely remains.

Distinguish between implemented, tested, partially verified, and not completed.

Do not report a feature as finished merely because its code was written.

## BEGIN NOW

Start by inspecting the actual repository and its current working-tree state.

Establish the baseline, perform the initial audit, and create a prioritized implementation plan.

Then execute the work phase by phase, starting with the shared design system and interaction primitives.

Continue through the CEO panel, company workspaces, help center, accessibility, animation, and quality verification until the scoped work is implemented and validated.

The mission is to establish a lasting professional standard for NEXUS, not to perform a one-time visual redesign.
