# DineInGo Immersive: 2D-to-3D Implementation Plan

Status: Planned / sandbox-only
Branch: `feature/immersive-2d-to-3d-sandbox`
Production rollout: Not authorized
Primary rule: Existing 2D layout, customer selection, booking and payment flows remain the production source of truth throughout development.

## Product definition

Business owners and event organizers continue creating and maintaining layouts with the existing 2D designers. They do not create, position, upload or edit 3D scenes.

DineInGo converts the saved 2D layout into a generated 3D scene. A customer's selection in the existing 2D layout must resolve to the exact same table, seat or event-area identifier in 3D. Selecting an item opens a perspective preview from that location. The customer can continue booking through the existing booking flow.

The same rendering engine supports two domain adapters:
- Restaurant: floors, tables, table shapes, seat counts, rotations, and existing floor features.
- Event: stage, individual seats, rows, sections, pricing tiers, and capacity-based areas (including standing/general admission zones).

The 3D scene is a visual projection, never an inventory or booking authority.

## Repository facts verified before implementation

- Frontend: React 18, TypeScript, Vite; Three.js and React Three Fiber/Drei are already dependencies.
- Existing feature flags live in `src/contexts/FeatureFlagContext.tsx`; the current typed flag set includes AR menus, pre-orders, events and waitlist.
- Existing developer sandbox is `src/pages/AdminSandboxPage.tsx`.
- Restaurant 2D layout editor is `src/components/FloorPlanDesigner.tsx`. Its layout uses floor dimensions, table IDs, labels, seat counts, category, shape, x/y coordinates, rotation, and floor features.
- Event 2D editor is `src/components/EventSeatingDesigner.tsx`; event data supports multiple seating modes, individual seats, row-based seats and concert/registration areas.
- Event persistence model is `backend/src/models/Event.ts`, with seat IDs, row labels, seat numbers, tiers, prices, and area x/y/width/height.
- Booking model is `backend/src/models/Booking.ts`; it already contains restaurant table/floor references and event seat/area references.
- Restaurant availability has existing `TableBooking` and `TableStatus` models. Do not replace these.
- `backend/src/models/ReconstructionJob.ts` is dish-model reconstruction infrastructure; it is not a venue scene schema and must not be repurposed as one.

Important existing implementation concern: the current frontend feature-flag context initializes its existing flags as enabled when the remote flag request has not completed or fails. The new immersive flag must use a fail-closed default (disabled), and the server must independently enforce the environment and authorization rules.

## Non-negotiable safety and compatibility rules

1. Do not rewrite or remove the existing 2D designers, 2D customer selection pages, booking routes, booking models, payment logic, or current APIs.
2. Add immersive code in isolated modules, routes and new persistence models. Avoid adding scene geometry to Restaurant, Event or Booking documents.
3. Add a dedicated flag named `immersive2dTo3d` (or a consistent backend-approved equivalent). It is OFF by default and OFF in production and normal staging.
4. Enable it only for the development sandbox and explicitly authorized developer/test accounts. Do not use a client-only flag as access control.
5. The sandbox must use synthetic/demo data by default. If real business layouts are used for testing, make the operation read-only and do not mutate their live layout or booking records.
6. Keep all generated scene records separate from source layout records. Record the source layout version/hash and generator version.
7. Every generated 3D selectable object must retain the source entity's exact stable ID: restaurant table ID, event seat ID, or event area ID.
8. The backend remains authoritative for price, availability, holds, capacity and booking confirmation. The 3D client must revalidate through existing booking services.
9. Published/generated scene snapshots are immutable. A changed source layout creates a new generated version; customers must not see partially generated scenes.
10. If a scene is missing, invalid, stale, too large or fails to load, fall back to the existing 2D flow without blocking booking.

## Phased implementation

### Phase 0 — Baseline audit and isolation design

Tasks:
- Trace the exact read/write paths used by both 2D designers and their customer-facing renderers.
- Identify the persisted restaurant floor-plan shape and event layout variants from actual API responses and fixtures; do not infer the restaurant schema from the designer's local TypeScript interface alone.
- Map stable IDs, coordinate units, coordinate origins, rotations, dimensions, floor boundaries and event zone semantics.
- Trace the existing backend feature-flag persistence/API/admin configuration and sandbox route authorization.
- Add regression fixtures from representative restaurant and event layouts, including empty, malformed, multi-floor, row-seat, individual-seat, standing-area and mixed event layouts.
- Record baseline tests for existing layout save/load, customer selection, availability and booking.

Exit criteria:
- A documented canonical input contract for each existing layout format.
- A verified mapping from source IDs to booking IDs.
- A feature-flag enforcement design that fails closed.
- Baseline tests pass unchanged.

### Phase 1 — Feature flag and sandbox shell

Tasks:
- Add `immersive2dTo3d` to backend flag schema/configuration, admin flag API and frontend flag types.
- Default it to disabled in code, database seeds, missing-config handling and API failures.
- Enforce server-side sandbox-only access; production and normal staging must reject immersive endpoints even if a client manually changes a flag.
- Add one "DineInGo Immersive (Under Development)" entry to the existing Developer Sandbox.
- Keep existing sandbox tabs and current app navigation intact.
- Add a dedicated route/component boundary for immersive sandbox preview; do not expose a public customer route yet.
- Use demo fixtures by default. Any optional real-venue preview must be read-only.

Exit criteria:
- The immersive tab appears only for authorized sandbox users.
- Direct URL/API access is denied outside the allowed environment.
- Disabling the flag immediately hides and blocks the feature.
- Existing features and routes behave exactly as before.

### Phase 2 — Canonical layout adapters and validation

Tasks:
- Implement pure, deterministic adapters: existing restaurant layout -> canonical spatial layout; event layout -> canonical spatial layout.
- Normalize coordinates into a documented world-space convention (X horizontal, Y vertical, Z depth), convert 2D canvas coordinates consistently, and define explicit scale calibration. Never assume that CSS pixels equal metres.
- Preserve IDs, floor IDs, labels, seat counts, shape, dimensions, rotation, category/tier, event areas and stage metadata.
- Validate duplicate/missing IDs, invalid dimensions, out-of-bounds positions, unsupported element types and impossible layouts.
- Keep source payloads immutable; adapters return new canonical data.
- Version the adapter contract and include source layout fingerprint/version.

Exit criteria:
- Golden fixture tests prove each source element maps to exactly one canonical element.
- Round-trip coordinate tests verify expected positions and rotations.
- Unsupported data produces a clear validation error and 2D fallback, not a broken booking page.

### Phase 3 — Shared 3D scene generation engine

Tasks:
- Build a shared React Three Fiber scene shell with lifecycle/disposal, loading/error states, responsive rendering and resource cleanup.
- Build procedural/template geometry for floors, walls, tables, chairs, restaurant fixtures, event stage, seats, rows and capacity zones.
- Create separate restaurant and event scene adapters over the shared engine.
- Keep object metadata keyed by stable source IDs; use raycasting only to resolve a rendered object back to that ID.
- Add camera orbit, pan, zoom, reset, floor navigation and scene bounds.
- Generate an initial stylized/illustrative scene from layout geometry. Do not claim photorealistic accuracy from a 2D map alone. Real venue heights, walls, decor and materials require optional configuration or calibrated templates later.
- Add lazy loading, geometry reuse/instancing, texture limits and mobile quality settings.

Exit criteria:
- Valid restaurant and event fixtures render deterministically.
- Every selectable 3D object resolves to the correct source ID.
- Scene disposal leaves no accumulating GPU resources.
- Low-end/mobile fallback is usable and the 2D booking flow remains available.

### Phase 4 — Synchronized 2D selection and 3D perspective preview

Tasks:
- Embed the 3D preview beside or behind the existing 2D selector in the sandbox experience.
- Selecting a 2D restaurant table highlights the exact table in 3D and moves the camera to a calibrated eye-level viewpoint at that table.
- Selecting an event seat moves the camera to that exact seat, facing the stage using the event's stage orientation.
- Selecting an event area previews the zone; standing/general-admission areas show a zone-level perspective rather than invented individual seats.
- Support reverse synchronization: selecting an object in 3D highlights the matching item in 2D.
- Provide camera reset, return-to-overview, and a clear selected-item summary.
- Keep selected state separate from availability and booking state.

Exit criteria:
- 2D -> 3D and 3D -> 2D selection synchronization works for all supported fixture types.
- Camera orientation and view direction are correct for front/back/rotated layouts.
- No selection action creates a booking or changes inventory.

### Phase 5 — Availability integration and booking handoff

Tasks:
- Read availability using the existing restaurant/event APIs and existing status/booking models.
- Reflect available, selected, held, booked, occupied and unavailable states using the actual supported domain statuses; do not invent availability from scene geometry.
- On "Continue", pass the exact existing tableId/floorId or seatNumbers/eventAreaId into the existing booking flow.
- Revalidate availability and price on the server at the normal booking boundary.
- Keep temporary holds, payment, confirmation, cancellation and expiry entirely within the existing booking services.
- Ensure scene refreshes never overwrite booking state and booking updates never rewrite geometry.

Exit criteria:
- A booking made through the immersive preview is identical in persistence and behaviour to a booking made through the existing 2D flow.
- Concurrent booking tests do not allow double booking.
- Failed/expired holds return the user to a valid 2D/3D selection state.
- Existing booking and payment regression tests pass.

### Phase 6 — Scene versioning, caching and reliability

Tasks:
- Store generated scene metadata/snapshots in separate collections, keyed by venue/event, source layout fingerprint and generator version.
- Cache generated geometry/assets and invalidate only when the source layout changes.
- Never overwrite the last valid generated scene until the next version passes validation.
- Add generation status, error reporting, telemetry and sandbox diagnostics.
- Add asset allowlists, file-size limits, upload validation if external assets are later introduced, and safe asset delivery.
- Add performance budgets and graceful fallbacks.

Exit criteria:
- Repeated requests reuse a valid generated scene.
- A failed regeneration leaves the previous valid scene and all existing 2D flows intact.
- Stale scenes are detected and not silently presented as current.
- Loading, rendering and fallback metrics are observable.

### Phase 7 — QA, controlled pilot and release gate

Tasks:
- Test representative real-world restaurant and event layouts in sandbox with owner-approved, read-only data.
- Test desktop, mobile, touch, keyboard, reduced-motion and low-performance devices.
- Run visual ID-alignment tests, API authorization tests, booking concurrency tests, security checks and full regression suite.
- Compare immersive-assisted booking completion and error rates with the existing 2D baseline.
- Obtain explicit product approval before enabling any non-sandbox environment.

Exit criteria:
- No regression in existing layout creation, selection, booking, payment or event registration.
- No booking conflicts attributable to immersive selection.
- 3D-to-source ID accuracy is 100% across the supported fixture suite.
- Feature flag remains disabled in production until a separate release decision is approved.

## Proposed module boundaries

Frontend:
- `src/features/immersive/flags/`
- `src/features/immersive/layout-adapters/restaurant/`
- `src/features/immersive/layout-adapters/event/`
- `src/features/immersive/scene/`
- `src/features/immersive/camera/`
- `src/features/immersive/selection/`
- `src/features/immersive/availability/`
- `src/features/immersive/sandbox/`

Backend:
- `backend/src/modules/immersive/routes/`
- `backend/src/modules/immersive/controllers/`
- `backend/src/modules/immersive/services/`
- `backend/src/modules/immersive/models/`
- `backend/src/modules/immersive/validators/`

These are proposed boundaries, not a requirement to move existing files or refactor current modules.

## Initial API shape (to be finalized after Phase 0)

- `GET /api/immersive/sandbox/layout/:type/:id`: read-only source layout plus normalized adapter diagnostics.
- `POST /api/immersive/sandbox/scenes/preview`: validate and generate a sandbox preview from a source layout; no source writes.
- `GET /api/immersive/sandbox/scenes/:sceneId`: retrieve generated preview metadata/scene payload.
- `GET /api/immersive/sandbox/flags`: expose the effective server-authorized sandbox flag state.

Do not create new booking endpoints for this feature. Booking handoff must call the existing booking flow.

## Suggested delivery order

1. Phase 0 and Phase 1 first: prove the data contract and isolate the flag.
2. Phase 2 and Phase 3 next: make deterministic scenes from existing layouts.
3. Phase 4 next: prove accurate 2D/3D synchronization and perspective.
4. Phase 5 only after selection accuracy is proven: connect the existing booking flow.
5. Phase 6 and Phase 7 before any broader release.

The work is complete only when the immersive feature can be switched off instantly and the original DineInGo application continues to work exactly as it did before the feature was introduced.
