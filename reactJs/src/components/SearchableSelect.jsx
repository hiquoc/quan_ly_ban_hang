import { useState, useEffect, useRef } from "react";
export default function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder,
    disabled,
    filterOutValues = [],
    onInputChange
}) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const ref = useRef(null);
    const timeoutRef = useRef(null);
    const safeOptions = options || [];
    const visibleOptions = safeOptions.filter(
        o => !filterOutValues.includes(String(o.value ?? o.id))
    );
    const selectedOption = visibleOptions.find(o => String(o.value ?? o.id) === String(value));
    const filteredOptions = visibleOptions.filter(o =>
        (o.label ?? o.name ?? "").toLowerCase().includes(search.toLowerCase())
    );
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleInputChange = async (e) => {
        const val = e.target.value;
        setSearch(val);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            try {
                setIsLoading(true);
                await onInputChange(val);
            } finally {
                setIsLoading(false);
            }
        }, 500);
    };

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    return (
        <div ref={ref} className="relative w-full">
            <input
                type="text"
                placeholder={placeholder}
                value={isOpen ? search : (selectedOption?.label ?? selectedOption?.name ?? "")}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                disabled={disabled}
                className={`border p-3 rounded w-full ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
            />
            {isOpen && !disabled && (
                <ul className="absolute z-10 bg-white border rounded shadow-md w-full max-h-48 overflow-y-auto mt-1">
                    {isLoading ? (
                        <li className="flex gap-2 justify-center items-center p-2 text-gray-500">
                            <svg
                                className="animate-spin h-5 w-5 text-gray-700"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                ></path>
                            </svg>
                            Đang tải...</li>
                    ) : (filteredOptions.length > 0 ? (
                        filteredOptions.map(o => (
                            <li
                                key={o.value ?? o.id}
                                className={`p-2 hover:bg-blue-100 cursor-pointer ${String(o.value ?? o.id) === String(value) ? "bg-blue-50" : ""}`}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setSearch("");
                                    setIsOpen(false);
                                    onChange(o.value ?? o.id);
                                }}
                            >
                                {o.label ?? o.name}
                            </li>
                        ))
                    ) : (
                        <li className="p-2 text-gray-500">Không có kết quả</li>
                    ))}
                </ul>
            )}
        </div>
    );
}