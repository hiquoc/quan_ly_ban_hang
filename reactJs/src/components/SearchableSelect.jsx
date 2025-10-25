import { useState, useEffect, useRef } from "react";

export default function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder,
    disabled,
    filterOutValues = [] 
}) {
    const [search, setSearch] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

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

    return (
        <div ref={ref} className="relative w-full">
            <input
                type="text"
                placeholder={placeholder}
                value={isOpen ? search : (selectedOption?.label ?? selectedOption?.name ?? "")}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsOpen(true)}
                disabled={disabled}
                className={`border p-2 rounded w-full ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
            />
            {isOpen && !disabled && (
                <ul className="absolute z-10 bg-white border rounded shadow-md w-full max-h-48 overflow-y-auto mt-1">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(o => (
                            <li
                                key={o.value ?? o.id}
                                className={`p-2 hover:bg-blue-100 cursor-pointer ${String(o.value ?? o.id) === String(value) ? "bg-blue-50" : ""}`}
                                onClick={() => {
                                    onChange(o.value ?? o.id);
                                    setSearch("");
                                    setIsOpen(false);
                                }}
                            >
                                {o.label ?? o.name}
                            </li>
                        ))
                    ) : (
                        <li className="p-2 text-gray-500">Không có kết quả</li>
                    )}
                </ul>
            )}
        </div>
    );
}
