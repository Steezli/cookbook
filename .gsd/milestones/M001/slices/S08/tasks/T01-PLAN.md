# T01: 09-navigation-restructure 01

**Slice:** S08 — **Milestone:** M001

## Description

Install the lucide icon library, fix jest config for .tsx test files, create shared nav type contracts, and build the PageContainer component with TDD.

Purpose: Establishes the foundation that Plans 02 and 03 depend on — lucide icons for nav chrome, test infrastructure for .tsx components, type contracts for cross-plan consistency, and the PageContainer that wraps every screen.

Output: lucide-react-native installed, jest handles .tsx tests, nav types file, tested PageContainer component.

## Must-Haves

- [ ] "PageContainer applies 20px horizontal padding on mobile breakpoint"
- [ ] "PageContainer applies 32px horizontal padding on tablet breakpoint"
- [ ] "PageContainer applies 40px horizontal padding on web breakpoint"
- [ ] "PageContainer 'form' variant constrains to 600px max-width centered"
- [ ] "PageContainer 'content' variant constrains to 960px max-width centered"
- [ ] "lucide-react-native is installed and importable"

## Files

- `package.json`
- `package-lock.json`
- `jest.config.js`
- `src/components/nav/types.ts`
- `src/components/nav/PageContainer.tsx`
- `src/components/nav/__tests__/PageContainer.test.tsx`
