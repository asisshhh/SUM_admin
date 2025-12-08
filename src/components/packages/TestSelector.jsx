import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/client";
import { Search, X, Check } from "lucide-react";

// Internal debounce hook
function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function TestSelector({ selectedIds, onChange, existingTests }) {
  const [searchInput, setSearchInput] = useState("");
  const [showSelected, setShowSelected] = useState(true);
  const debouncedSearch = useDebounce(searchInput, 300);

  // Fetch tests
  const { data: testsData, isLoading } = useQuery({
    queryKey: ["lab-tests-selector", debouncedSearch],
    queryFn: async () => {
      const params = { pageSize: 100, active: "true" };
      if (debouncedSearch) params.search = debouncedSearch;
      return (await api.get("/lab-tests", { params })).data;
    },
    staleTime: 30000
  });

  const availableTests = testsData?.items || [];

  // Build test map
  const testMap = useMemo(() => {
    const map = new Map();
    availableTests.forEach(t => map.set(t.id, t));
    existingTests?.forEach(t => {
      const id = t.testId || t.id;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: t.test?.name || t.name || `Test #${id}`,
          code: t.test?.code || t.code || '',
          price: t.test?.price || t.price || 0
        });
      }
    });
    return map;
  }, [availableTests, existingTests]);

  // Get selected test details
  const selectedTests = useMemo(() =>
    selectedIds.map(id => testMap.get(id)).filter(Boolean),
    [selectedIds, testMap]
  );

  const toggleTest = useCallback((testId) => {
    if (selectedIds.includes(testId)) {
      onChange(selectedIds.filter(id => id !== testId));
    } else {
      onChange([...selectedIds, testId]);
    }
  }, [selectedIds, onChange]);

  const removeTest = useCallback((testId) => {
    onChange(selectedIds.filter(id => id !== testId));
  }, [selectedIds, onChange]);

  return (
    <div className="space-y-3">
      {/* Selected Tests Display */}
      {selectedIds.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSelected(!showSelected)}
            className="w-full flex items-center justify-between p-3 bg-emerald-50 border-b text-left">
            <span className="text-sm font-medium text-emerald-800">
              ✓ {selectedIds.length} Test(s) Included
            </span>
            <span className="text-xs text-emerald-600">{showSelected ? "Hide" : "Show"}</span>
          </button>
          {showSelected && (
            <div className="max-h-40 overflow-y-auto divide-y">
              {selectedTests.map(test => (
                <div key={test.id} className="flex items-center justify-between px-4 py-2 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{test.name}</div>
                    <div className="text-xs text-slate-500">{test.code} {test.price ? `• ₹${test.price}` : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTest(test.id)}
                    className="p-1 hover:bg-red-50 rounded text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Tests Section */}
      <div className="border rounded-xl overflow-hidden">
        <div className="p-3 bg-slate-50 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="input pl-9 pr-8 text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search tests by name or code..."
            />
            {searchInput !== debouncedSearch && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
        <div className="h-64 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
              Loading tests...
            </div>
          ) : availableTests.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              {debouncedSearch ? "No tests match your search" : "No lab tests available"}
            </div>
          ) : (
            availableTests.map(test => (
              <label
                key={test.id}
                className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer border-b last:border-b-0 transition ${
                  selectedIds.includes(test.id) ? 'bg-blue-50' : ''
                }`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(test.id)}
                  onChange={() => toggleTest(test.id)}
                  className="w-4 h-4 accent-blue-600 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{test.name}</div>
                  <div className="text-xs text-slate-500">
                    <span className="font-mono">{test.code}</span>
                    {test.price && <span> • ₹{test.price.toLocaleString()}</span>}
                    {test.category?.name && <span> • {test.category.name}</span>}
                  </div>
                </div>
                {selectedIds.includes(test.id) && (
                  <Check size={16} className="text-blue-600 flex-shrink-0" />
                )}
              </label>
            ))
          )}
        </div>
        <div className="px-3 py-2 bg-slate-50 border-t text-xs text-slate-500 flex justify-between">
          <span>Showing {availableTests.length} tests</span>
          {selectedIds.length > 0 && (
            <span className="text-blue-600 font-medium">{selectedIds.length} selected</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(TestSelector);

