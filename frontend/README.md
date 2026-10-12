# Frontend

React, Vite, and Tailwind frontend for Cloud Agent.

## Development

```sh
pnpm install
pnpm dev
```

The development server proxies `/auth`, `/me`, and `/conversations` to the backend at `http://localhost:3000`.

```sh
pnpm lint
pnpm test
pnpm build
```

## Source structure

```text
src/
├── main.jsx                 # Mounts React and loads global styles
├── App.jsx                  # Chooses loading, authentication, or workspace UI
├── components/
│   ├── auth/                # Authentication form and product story
│   ├── common/              # Shared branding and loading UI
│   ├── conversation/        # Composer, message list, run details, quick tasks
│   ├── git-diff/            # Diff viewer, files, rows, review actions, local CSS
│   ├── layout/              # Workspace shell, sidebar, mobile header, coordinator
│   └── repositories/        # Repository cards
├── pages/                   # Auth, home, conversations, conversation, repositories, account
├── hooks/                   # Authentication, workspace actions, polling, repository syncing
├── api/                     # HTTP transport, session refresh, endpoint methods
├── constants/               # Starter task templates
├── utils/                   # Git diff parsing and user display helpers
└── styles/                  # Tailwind, theme, base styles, shared classes
```

## Adding or changing UI

- Put each component in its domain folder under `components/`. Use PascalCase filenames and one primary component per file.
- Keep pages focused on composing UI. Pass data and callbacks explicitly; components should not depend on the workspace's entire state object.
- Put stateful behavior and side effects in hooks. `useAuth` owns the session; `useWorkspace` coordinates navigation and actions using `useRepositories`, `useConversationList`, and `useActiveConversation`.
- Keep HTTP details in `api/`. `client.js` handles JSON, credentials, and errors. `sessionRequest.js` handles authenticated request retries. Endpoint modules describe requests without duplicating transport behavior.
- Put pure helpers in `utils/` and static configuration in `constants/`.
- Keep Tailwind utilities with their markup, shared theme rules in `styles/`, and component-specific CSS beside its component.

The workspace retains the existing state-based navigation. Polling hooks clear their timers and ignore pending polling responses after cleanup. Completed changes from the latest code run can be published using the pull request dialog in `components/conversation/`. Publishing disables messages and file review until it finishes; published runs show their GitHub PR link. Tests cover publication state, PR request payloads, session refresh, file review payloads, and error handling.
