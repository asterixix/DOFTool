/**
 * SearchBar Component - Unit tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SearchBar } from './SearchBar';

import type { EmailSearchQuery } from './SearchBar';

describe('SearchBar', () => {
  const defaultQuery: EmailSearchQuery = {
    query: '',
    limit: 100,
  };

  const mockOnQueryChange = vi.fn();
  const mockOnSearch = vi.fn();

  const defaultProps = {
    query: defaultQuery,
    onQueryChange: mockOnQueryChange,
    onSearch: mockOnSearch,
    isLoading: false,
    folders: [
      { path: 'INBOX', name: 'Inbox' },
      { path: 'Sent', name: 'Sent' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<SearchBar {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search emails (Ctrl+K)')).toBeInTheDocument();
    });

    it('should render Filters button', () => {
      render(<SearchBar {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Filters/i })).toBeInTheDocument();
    });

    it('should render Search button', () => {
      render(<SearchBar {...defaultProps} />);

      expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
    });

    it('should display Search icon in input', () => {
      render(<SearchBar {...defaultProps} />);

      const searchIcon = document.querySelector('.lucide-search');
      expect(searchIcon).toBeInTheDocument();
    });
  });

  describe('search input', () => {
    it('should display current query value', () => {
      const queryWithValue: EmailSearchQuery = { query: 'test search', limit: 100 };
      render(<SearchBar {...defaultProps} query={queryWithValue} />);

      const input = screen.getByPlaceholderText('Search emails (Ctrl+K)');
      expect(input).toHaveValue('test search');
    });

    it('should call onQueryChange when typing', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search emails (Ctrl+K)');
      await user.type(input, 'a');

      expect(mockOnQueryChange).toHaveBeenCalledWith({ ...defaultQuery, query: 'a' });
    });

    it('should trigger search on Enter key', async () => {
      const user = userEvent.setup();
      const queryWithValue: EmailSearchQuery = { query: 'test search', limit: 100 };
      render(<SearchBar {...defaultProps} query={queryWithValue} />);

      const input = screen.getByPlaceholderText('Search emails (Ctrl+K)');
      await user.type(input, '{Enter}');

      expect(mockOnSearch).toHaveBeenCalledWith(queryWithValue);
    });

    it('should clear query on Escape key', async () => {
      const user = userEvent.setup();
      const queryWithValue: EmailSearchQuery = { query: 'test search', limit: 100 };
      render(<SearchBar {...defaultProps} query={queryWithValue} />);

      const input = screen.getByPlaceholderText('Search emails (Ctrl+K)');
      await user.type(input, '{Escape}');

      expect(mockOnQueryChange).toHaveBeenCalled();
    });

    it('should not search with empty query', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search emails (Ctrl+K)');
      await user.type(input, '{Enter}');

      expect(mockOnSearch).not.toHaveBeenCalled();
    });
  });

  describe('clear button', () => {
    it('should not show clear button when query is empty', () => {
      render(<SearchBar {...defaultProps} />);

      const clearButtons = screen.queryAllByRole('button');
      const clearButton = clearButtons.find((btn) => btn.querySelector('.lucide-x'));
      expect(clearButton).toBeUndefined();
    });

    it('should show clear button when query has value', () => {
      const queryWithValue: EmailSearchQuery = { query: 'test search', limit: 100 };
      render(<SearchBar {...defaultProps} query={queryWithValue} />);

      const xIcon = document.querySelector('.lucide-x');
      expect(xIcon).toBeInTheDocument();
    });

    it('should clear query when clear button is clicked', async () => {
      const user = userEvent.setup();
      const queryWithValue: EmailSearchQuery = { query: 'test search', limit: 100 };
      render(<SearchBar {...defaultProps} query={queryWithValue} />);

      const clearButton = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('.lucide-x'));
      if (clearButton) {
        await user.click(clearButton);
      }

      expect(mockOnQueryChange).toHaveBeenCalledWith(
        expect.objectContaining({ query: '', limit: 100 })
      );
    });
  });

  describe('search button', () => {
    it('should be disabled when query is empty', () => {
      render(<SearchBar {...defaultProps} />);

      const searchButton = screen.getByRole('button', { name: /Search/i });
      expect(searchButton).toBeDisabled();
    });

    it('should be disabled when loading', () => {
      const queryWithValue: EmailSearchQuery = { query: 'test', limit: 100 };
      render(<SearchBar {...defaultProps} isLoading={true} query={queryWithValue} />);

      const searchButton = screen.getByRole('button', { name: /Searching/i });
      expect(searchButton).toBeDisabled();
    });

    it('should show Searching... text when loading', () => {
      const queryWithValue: EmailSearchQuery = { query: 'test', limit: 100 };
      render(<SearchBar {...defaultProps} isLoading={true} query={queryWithValue} />);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should be enabled when query has value and not loading', () => {
      const queryWithValue: EmailSearchQuery = { query: 'test', limit: 100 };
      render(<SearchBar {...defaultProps} query={queryWithValue} />);

      const searchButton = screen.getByRole('button', { name: /Search/i });
      expect(searchButton).not.toBeDisabled();
    });

    it('should call onSearch when clicked', async () => {
      const user = userEvent.setup();
      const queryWithValue: EmailSearchQuery = { query: 'test', limit: 100 };
      render(<SearchBar {...defaultProps} query={queryWithValue} />);

      const searchButton = screen.getByRole('button', { name: /Search/i });
      await user.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith(queryWithValue);
    });
  });

  describe('filters popover', () => {
    it('should open filters popover when Filters button is clicked', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const filtersButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filtersButton);

      expect(screen.getByText('From')).toBeInTheDocument();
      expect(screen.getByText('To')).toBeInTheDocument();
      expect(screen.getByText('Folder')).toBeInTheDocument();
    });

    it('should display From input in popover', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const filtersButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filtersButton);

      expect(screen.getByPlaceholderText('sender@example.com')).toBeInTheDocument();
    });

    it('should display To input in popover', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const filtersButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filtersButton);

      expect(screen.getByPlaceholderText('recipient@example.com')).toBeInTheDocument();
    });

    it('should display Has attachments checkbox', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const filtersButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filtersButton);

      expect(screen.getByLabelText('Has attachments')).toBeInTheDocument();
    });

    it('should have Cancel and Apply buttons', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const filtersButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filtersButton);

      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Apply/i })).toBeInTheDocument();
    });

    it('should call onQueryChange when From filter is changed', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const filtersButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filtersButton);

      const fromInput = screen.getByPlaceholderText('sender@example.com');
      await user.type(fromInput, 'test@example.com');

      expect(mockOnQueryChange).toHaveBeenCalled();
    });
  });

  describe('keyboard shortcuts', () => {
    it('should focus input on Ctrl+K', () => {
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search emails (Ctrl+K)');

      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

      expect(document.activeElement).toBe(input);
    });

    it('should focus input on Cmd+K (Mac)', () => {
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByPlaceholderText('Search emails (Ctrl+K)');

      fireEvent.keyDown(window, { key: 'k', metaKey: true });

      expect(document.activeElement).toBe(input);
    });
  });

  describe('with accountId', () => {
    it('should preserve accountId when clearing', async () => {
      const user = userEvent.setup();
      const queryWithValue: EmailSearchQuery = {
        query: 'test',
        limit: 100,
        accountId: 'account-123',
      };
      render(<SearchBar {...defaultProps} accountId="account-123" query={queryWithValue} />);

      const clearButton = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('.lucide-x'));
      if (clearButton) {
        await user.click(clearButton);
      }

      expect(mockOnQueryChange).toHaveBeenCalledWith(
        expect.objectContaining({ accountId: 'account-123' })
      );
    });
  });
});
