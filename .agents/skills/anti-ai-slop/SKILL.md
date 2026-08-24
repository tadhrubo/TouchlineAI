# Anti-AI-Slop Frontend Design Skill

## Purpose

This skill prevents generic, repetitive, template-like AI-generated UI.

The goal is not to make every interface minimalist, brutalist, experimental, or visually complex.

The goal is to make interfaces feel **intentional, designed, branded, and human-made**.

When designing or implementing frontend UI, prioritize:

* visual hierarchy
* typography
* composition
* spacing
* restraint
* brand identity
* content hierarchy
* functional clarity
* deliberate visual decisions

Avoid adding visual elements merely because an AI-generated interface "looks empty" without them.

---

# 1. Core Principle

DO NOT design from a collection of familiar UI components.

Design from:

1. the product's purpose
2. the user's primary task
3. the brand's personality
4. the content hierarchy
5. the visual identity
6. the interaction hierarchy

A page should look like it was designed specifically for this product.

Do not make it look like a generic SaaS template.

---

# 2. NEVER Default to AI-Generated UI Patterns

Do not automatically use:

* rounded cards everywhere
* excessive card grids
* floating cards
* excessive pills
* gradient backgrounds
* purple/blue "AI" gradients
* glowing borders
* glassmorphism
* blurred decorative blobs
* floating 3D objects
* random geometric decorations
* excessive shadows
* excessive borders
* icon-in-circle feature blocks
* three-column feature grids
* centered hero sections by default
* giant gradient headlines
* oversized dashboard cards
* arbitrary badges
* decorative sparkles
* fake testimonials
* fake statistics
* meaningless "trusted by" logos
* generic pricing tables
* generic feature sections
* repetitive section structures
* excessive use of accordions
* excessive use of modals
* excessive use of floating action buttons
* unnecessary empty-state illustrations
* decorative icons that communicate nothing
* visual elements added purely to fill whitespace

These patterns are not forbidden in every circumstance.

They are forbidden as DEFAULTS.

If one is used, there must be a clear product, content, or brand reason.

---

# 3. DO NOT USE THE "AI SAAS TEMPLATE"

Avoid this default structure:

Hero
→ Logo row
→ 3 feature cards
→ Screenshot inside rounded container
→ Statistics
→ Testimonials
→ Pricing cards
→ FAQ
→ CTA
→ Footer

Do not construct pages by stacking familiar marketing sections.

Instead, determine what the page actually needs.

A simple page with four excellent sections is better than a page with twelve predictable sections.

---

# 4. Typography Is a Primary Design Tool

Do not treat typography as an afterthought.

Before choosing layout details, establish:

* display typeface
* body typeface
* hierarchy
* scale
* weight
* line-height
* letter-spacing
* maximum text width

Do not default to:

* Inter
* Roboto
* Arial
* system-ui

unless the project specifically calls for them.

Choose typography based on the brand.

Do not use more than necessary.

A strong typographic hierarchy can replace unnecessary cards, borders, icons, and decoration.

Avoid making every heading huge.

Avoid making every piece of text bold.

Avoid excessive uppercase labels.

Avoid excessive letter spacing.

---

# 5. Color Discipline

Do not invent colors randomly.

First identify:

* primary background
* primary surface
* primary text
* secondary text
* accent
* semantic colors

Use a restrained palette.

Do not use gradients simply because they make a page appear more "premium."

Do not introduce a new accent color for every section.

Do not use colorful icons merely to create visual variety.

If the brand uses one strong accent, let that accent have meaning.

---

# 6. Spacing and Composition

Whitespace is not a problem that needs to be filled.

Do not add:

* cards
* illustrations
* icons
* decorative shapes
* gradients
* borders

just because an area contains whitespace.

Use whitespace to establish hierarchy.

Prefer deliberate asymmetry when appropriate.

Do not force every section into:

* centered content
* equal columns
* identical card widths
* identical vertical spacing

Variation should come from the content and hierarchy, not random decoration.

---

# 7. Cards

Cards are a tool, not a default layout primitive.

Before creating a card, ask:

"Does this information actually need containment?"

If the answer is no, use:

* typography
* spacing
* dividers
* alignment
* grouping

instead.

Do not put every piece of information into its own rounded rectangle.

Avoid nesting cards inside cards.

Avoid cards containing icons, which contain badges, which contain text, which contain another card.

---

# 8. Border Radius

Do not automatically use large rounded corners.

Choose radius based on the visual language.

Possible approaches include:

* sharp corners
* subtle radius
* medium radius
* large radius

But do not use large radius everywhere simply because modern SaaS interfaces commonly do.

A button, card, input, modal, image, and section do not necessarily need identical corner treatment.

---

# 9. Shadows

Use shadows sparingly.

Do not give every card a shadow.

Do not use dramatic floating shadows to make ordinary rectangles look important.

Prefer hierarchy through:

* contrast
* spacing
* typography
* position
* scale

Use shadows only when they communicate elevation or interaction.

---

# 10. Icons

Do not add icons to every feature.

An icon should communicate something useful.

Avoid:

"icon + title + paragraph"

repeated six times across a page unless that structure is genuinely appropriate.

Do not place every icon inside a colored circular container.

If text communicates the idea better, remove the icon.

---

# 11. Images and Illustrations

Do not add decorative imagery simply because the interface looks empty.

Images should have a purpose:

* communicate the product
* establish brand identity
* explain something
* create emotional context
* demonstrate the product
* support the content

Do not use generic abstract AI illustrations.

Do not use meaningless 3D blobs.

Do not use generic "person using laptop" imagery.

---

# 12. Hero Sections

Do not automatically create:

small eyebrow
+
huge centered heading
+
paragraph
+
two buttons
+
floating product screenshot
+
gradient background

Instead, determine the most important message and create a composition around it.

The hero should establish the product's identity immediately.

Do not add visual complexity merely to make the hero look impressive.

A restrained hero is often stronger.

---

# 13. Navigation

Do not automatically create a large pill-shaped navigation bar floating over the page.

Do not automatically put everything inside a rounded container.

Navigation should follow the product's visual language.

Prioritize:

* clarity
* hierarchy
* discoverability
* appropriate density

---

# 14. Buttons

Buttons should have a clear hierarchy.

Normally establish:

* primary action
* secondary action
* tertiary/text action

Do not make every button visually dominant.

Do not use gradients on buttons unless the brand specifically requires them.

Do not make buttons unnecessarily large.

Do not turn every link into a pill.

---

# 15. Forms

Forms should feel calm and functional.

Do not decorate inputs unnecessarily.

Avoid:

* excessive rounded containers
* floating labels without a reason
* unnecessary icons
* oversized inputs
* decorative backgrounds

Focus on:

* hierarchy
* readability
* labels
* error states
* interaction states
* accessibility

---

# 16. Dashboards

Do not build dashboards by generating a grid of cards first.

First determine:

1. What does the user need to know?
2. What does the user need to do?
3. What information is primary?
4. What information is secondary?
5. What information can be removed?

Then create the layout.

Do not automatically produce:

* KPI cards
* charts
* activity cards
* progress cards
* statistics cards

unless they serve a real purpose.

---

# 17. Mobile Design

Do not simply shrink the desktop layout.

Reconsider the hierarchy for mobile.

Ask:

* What must remain visible?
* What can disappear?
* What should become stacked?
* What should become horizontally scrollable?
* What needs larger touch targets?
* What information can be delayed?

Mobile should feel intentionally designed.

---

# 18. Responsive Behavior

Do not rely exclusively on generic breakpoint stacking.

Consider how the composition changes between:

* mobile
* tablet
* desktop
* large desktop

Some layouts should transform rather than simply stack.

---

# 19. Existing Design Must Be Respected

If the project already has:

* a logo
* typography
* color system
* hero
* navigation
* established components
* brand guidelines
* reference screenshots

DO NOT redesign them unless explicitly instructed.

If the user says:

"Do not touch the hero"

then the hero is LOCKED.

Do not modify:

* typography
* spacing
* colors
* content
* layout
* buttons
* imagery

inside that section.

Work around established design decisions.

---

# 20. Reference Images

If the user provides a visual reference:

Do not copy the reference literally.

Extract its design principles:

* composition
* density
* hierarchy
* typography
* spacing
* color relationships
* visual rhythm
* image treatment

Then create an original implementation appropriate to the product.

---

# 21. Before Writing UI Code

Before implementing a major UI, silently determine:

### Product

What is this product?

### User

Who is using it?

### Primary task

What is the most important thing the user needs to accomplish?

### Hierarchy

What should the eye see first, second, and third?

### Identity

What makes this interface belong to this specific product?

### Restraint

What can be removed?

If these questions cannot be answered, do not compensate by adding decorative UI.

---

# 22. The "Remove 20%" Rule

After designing a section, inspect every element.

For each element ask:

"Would the interface become weaker if this disappeared?"

If the answer is no:

REMOVE IT.

Do not preserve elements merely because they make the interface look more elaborate.

Prefer:

5 strong elements

over

12 mediocre elements.

---

# 23. Anti-Pattern Detection

Before considering a UI complete, check for:

* excessive rounded rectangles
* excessive cards
* repeated icon blocks
* excessive pills
* excessive gradients
* excessive shadows
* generic SaaS layouts
* predictable three-column grids
* unnecessary decorative elements
* inconsistent typography
* excessive visual noise
* arbitrary colors
* unnecessary borders
* repeated component patterns
* excessive centered layouts
* meaningless empty-state illustrations
* AI-looking decorative graphics

If several appear together, redesign the composition rather than merely adjusting CSS.

---

# 24. Quality Bar

The final UI should feel:

* intentional
* restrained
* distinctive
* coherent
* editorial where appropriate
* brand-specific
* professionally designed
* visually calm
* purposeful

It should NOT feel:

* generated
* templated
* over-decorated
* generic
* like a startup landing-page template
* like a component library demo
* like an AI dashboard
* like a Dribbble imitation

---

# 25. Final Design Review

Before finishing, perform a visual review.

Evaluate:

1. Does the page have a clear visual hierarchy?
2. Can the product identity be recognized without the logo?
3. Is every major element justified?
4. Are there unnecessary cards?
5. Are there unnecessary icons?
6. Are there unnecessary gradients?
7. Are there unnecessary shadows?
8. Is typography doing enough of the design work?
9. Is whitespace being respected?
10. Does the layout feel specific to this product?
11. Does it look like a template?
12. Could 20% of the visual elements be removed?
13. Does mobile feel intentionally designed?
14. Did implementation accidentally change established design decisions?

If the answer to #11 is yes, redesign the composition.

Do not simply add decoration.

---

# 26. Golden Rule

**Do not make the interface look more designed.**

**Make the design decisions better.**

When uncertain, choose:

* fewer elements
* stronger hierarchy
* better typography
* better spacing
* clearer composition
* more meaningful interaction
* less decoration

Never add visual noise to compensate for weak design.
