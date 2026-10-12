import { Bug, Code2, MessageSquare, TestTube2 } from 'lucide-react';

export const taskTemplates = [
  {
    icon: Bug,
    category: 'Issue Resolution',
    title: 'Fix a bug or failing test',
    description: 'Agent clones your repo into a sandbox, inspects stack traces, and writes code fixes.',
    mode: 'code',
    prompt: 'Diagnose the failing tests in this repository, find the root cause, and implement the necessary bug fixes.',
  },
  {
    icon: Code2,
    category: 'Feature Development',
    title: 'Implement feature or API endpoint',
    description: 'Describe requirements in plain language and review the resulting code changes in an interactive diff.',
    mode: 'code',
    prompt: 'Implement a new feature with complete error handling, validation, and corresponding test coverage.',
  },
  {
    icon: TestTube2,
    category: 'Quality Assurance',
    title: 'Generate unit & integration tests',
    description: 'Boost repository test coverage with automated unit, integration, and edge-case test suites.',
    mode: 'code',
    prompt: 'Analyze uncovered files and functions in the repository and create automated test suites.',
  },
  {
    icon: MessageSquare,
    category: 'Codebase Exploration',
    title: 'Analyze architecture & codebase',
    description: 'Ask questions to explore repository structure, data flows, dependencies, or logic.',
    mode: 'chat',
    prompt: 'Provide a breakdown of the repository architecture, major service modules, and entry points.',
  },
];
