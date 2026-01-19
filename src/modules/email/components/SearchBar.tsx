/**
 * SearchBar Component
 * Email search interface with advanced filters
 */

import { useState, useCallback, useRef, useEffect } from 'react';

import { Search, X, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export interface EmailSearchQuery {
  query: string;
  accountId?: string;
  folder?: string;
  from?: string;
  to?: string;
  dateFrom?: number;
  dateTo?: number;
  hasAttachments?: boolean;
  limit?: number;
}

interface SearchBarProps {
  query: EmailSearchQuery;
  onQueryChange: (query: EmailSearchQuery) => void;
  onSearch: (query: EmailSearchQuery) => void;
  isLoading?: boolean;
  accountId?: string;
  folders?: Array<{ path: string; name: string }>;
}

export function SearchBar({
  query,
  onQueryChange,
  onSearch,
  isLoading = false,
  accountId,
  folders = [],
}: SearchBarProps): JSX.Element {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleQueryChange = useCallback(
    (field: keyof EmailSearchQuery, value: string | number | boolean | undefined) => {
      onQueryChange({ ...query, [field]: value });
    },
    [query, onQueryChange]
  );

  const handleSearch = useCallback(() => {
    if (query.query.trim()) {
      onSearch(query);
    }
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    const clearQuery: EmailSearchQuery = {
      query: '',
      limit: 100,
    };

    if (accountId !== undefined) {
      clearQuery.accountId = accountId;
    }

    onQueryChange(clearQuery);
  }, [accountId, onQueryChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    },
    [handleSearch, handleClear]
  );

  // Focus search on Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          className="pl-9 pr-9"
          placeholder="Search emails (Ctrl+K)"
          type="text"
          value={query.query}
          onChange={(e) => handleQueryChange('query', e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {query.query && (
          <Button
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Popover open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" type="button" variant="outline">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="space-y-4">
            <div>
              <Label>From</Label>
              <Input
                placeholder="sender@example.com"
                type="email"
                value={query.from ?? ''}
                onChange={(e) => handleQueryChange('from', e.target.value || undefined)}
              />
            </div>

            <div>
              <Label>To</Label>
              <Input
                placeholder="recipient@example.com"
                type="email"
                value={query.to ?? ''}
                onChange={(e) => handleQueryChange('to', e.target.value || undefined)}
              />
            </div>

            <div>
              <Label>Folder</Label>
              <Select
                value={query.folder ?? 'all'}
                onValueChange={(value) =>
                  handleQueryChange('folder', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All folders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All folders</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.path} value={folder.path}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <input
                checked={query.hasAttachments ?? false}
                className="h-4 w-4 rounded border-gray-300"
                id="hasAttachments"
                type="checkbox"
                onChange={(e) => handleQueryChange('hasAttachments', e.target.checked || undefined)}
              />
              <Label className="cursor-pointer font-normal" htmlFor="hasAttachments">
                Has attachments
              </Label>
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                className="flex-1"
                size="sm"
                type="button"
                variant="outline"
                onClick={() => setIsFiltersOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                size="sm"
                type="button"
                onClick={() => {
                  setIsFiltersOpen(false);
                  handleSearch();
                }}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button
        disabled={!query.query.trim() || isLoading}
        size="sm"
        type="button"
        onClick={handleSearch}
      >
        {isLoading ? 'Searching...' : 'Search'}
      </Button>
    </div>
  );
}
