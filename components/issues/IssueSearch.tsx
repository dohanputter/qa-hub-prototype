"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

interface IssueSearchProps {
    labels: any[];
    projectId: number;
}

export function IssueSearch({ labels, projectId }: IssueSearchProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") || "";
    const initialLabels = searchParams.get("labels") || "";

    // If we have labels in URL, show them as @label in search box for consistency
    const getInitialQuery = () => {
        if (initialLabels) {
            // Just take the first label for simplicity if multiple
            return `@${initialLabels.split(',')[0]}`;
        }
        return initialSearch;
    };

    const [query, setQuery] = useState(getInitialQuery());
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter labels based on query after '@'
    const filteredLabels = (query.startsWith('@') && labels)
        ? labels.filter(l => l.name.toLowerCase().includes(query.substring(1).toLowerCase()))
        : [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value.startsWith('@')) {
            const labelName = value.substring(1);
            // Check if it's a valid label
            const labelExists = labels.some(l => l.name.toLowerCase() === labelName.toLowerCase());

            if (labelExists) {
                params.set("labels", labelName);
                params.delete("search");
            } else {
                // If not a valid label, treat as text search? 
                // Or maybe the user is still typing. 
                // For now, let's just set search to the raw value if it doesn't match a label exactly
                // But usually @ searches imply label filtering.
                // Let's assume if it starts with @, we try to filter by label.
                // If the user just typed @bug but didn't select, we might want to search for text "@bug" 
                // OR filter by label "bug". 
                // Given the requirement "search by ticket name and label", let's prioritize label.

                // If we want to support partial label match, we might need backend support.
                // For now, let's just pass it as search if it's not an exact label match?
                // Or maybe we just clear everything if empty.
                params.delete("labels");
                params.set("search", value);
            }
        } else {
            params.delete("labels");
            if (value) {
                params.set("search", value);
            } else {
                params.delete("search");
            }
        }

        router.push(`?${params.toString()}`);
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only search if we are not showing suggestions (user might be selecting)
            // Or if the query doesn't look like a partial label
            if (!showSuggestions) {
                handleSearch(query);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, showSuggestions]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions && filteredLabels.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev + 1) % filteredLabels.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev - 1 + filteredLabels.length) % filteredLabels.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selectedLabel = filteredLabels[activeSuggestionIndex];
                setQuery(`@${selectedLabel.name}`);
                setShowSuggestions(false);
                // Trigger search immediately
                handleSearch(`@${selectedLabel.name}`);
            } else if (e.key === 'Escape') {
                setShowSuggestions(false);
            }
        } else if (e.key === 'Enter') {
            handleSearch(query);
            setShowSuggestions(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        if (val.startsWith('@')) {
            setShowSuggestions(true);
            setActiveSuggestionIndex(0);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectLabel = (labelName: string) => {
        const newQuery = `@${labelName}`;
        setQuery(newQuery);
        setShowSuggestions(false);
        inputRef.current?.focus();
        handleSearch(newQuery);
    };

    return (
        <div className="relative flex-1 max-w-sm" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search issues or type @ for labels..."
                    className="w-full pl-10 pr-8 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background shadow-sm text-foreground"
                    value={query}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            handleSearch('');
                            setShowSuggestions(false);
                            inputRef.current?.focus();
                        }}
                        className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSuggestions && filteredLabels.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase">
                        Select Label
                    </div>
                    <ul className="max-h-48 overflow-y-auto">
                        {filteredLabels.map((label: any, index: number) => (
                            <li
                                key={label.id}
                                onClick={() => selectLabel(label.name)}
                                className={`px-3 py-2 flex items-center gap-2 cursor-pointer text-sm ${index === activeSuggestionIndex
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-muted/50 text-foreground'
                                    }`}
                            >
                                <span
                                    className="w-3 h-3 rounded-full border border-foreground/10"
                                    style={{ backgroundColor: label.color }}
                                ></span>
                                <span className="font-medium">{label.name}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
