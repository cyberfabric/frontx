<!-- @standalone -->
# hai3:new-screenset - Create New Screenset

## AI WORKFLOW (REQUIRED)
1) Read .ai/targets/SCREENSETS.md before starting.
2) Gather requirements from user.
3) Follow steps below.

## GATHER REQUIREMENTS
Ask user for:
- Screenset name (camelCase).
- Category: Drafts | Mockups | Production.
- Initial screens.
- State management needed? (Y/N)
- API services needed? (Y/N)

## STEP 1: Create Screenset via CLI
```bash
hai3 screenset create {name} --category={category}
```
This creates:
- Directory structure with screens/home/.
- Centralized ids.ts with SCREENSET_ID and HOME_SCREEN_ID.
- All 36 language files for screenset and screen.
- Screen component with useScreenTranslations().
- Screenset config with lazy-loaded screen.
- Auto-registration via screensetRegistry.register().

## STEP 2: Add Additional Screens (if needed)
For each additional screen, follow hai3:new-screen command.

## STEP 3: If State Management Needed
Create domain-based structure:
- slices/{domain}Slice.ts for each domain.
- events/{domain}Events.ts with local DOMAIN_ID constant.
- effects/{domain}Effects.ts for each domain.
- actions/{name}Actions.ts.
Register each slice with its own effects. NO coordinator effects file. NO barrel exports.

## STEP 4: If API Services Needed
Create src/screensets/{name}/api/{Name}ApiService.ts
- Use template literal for domain: `${SCREENSET_ID}:serviceName`.
- Create mocks.ts and import in screenset config.

## STEP 5: Validate
```bash
npm run type-check && npm run arch:check && npm run lint && npm run dev
```

## STEP 6: Test via Chrome MCP
STOP: If MCP WebSocket is closed, fix first.
- Verify screenset in selector.
- Switch to new screenset via dev panel.
- Check 0 console errors.
- Test all screens and features.
