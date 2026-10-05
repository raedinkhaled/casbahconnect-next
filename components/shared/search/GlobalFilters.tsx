"use client";
import { GlobalSearchFilters } from "@/constants/filters";
import { formUrlQuery } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import React from "react";

const GlobalFilters = () => {
  const searchParams = useSearchParams();
  const typeParams = searchParams.get("type");

  const active = typeParams || "";

  const handleTypeClick = (type: string) => {
    if (active === type) {
      const newUrl = formUrlQuery({
        params: searchParams.toString(),
        key: "type",
        value: null,
      });
      window.history.replaceState(null, "", newUrl);
    } else {
      const newUrl = formUrlQuery({
        params: searchParams.toString(),
        key: "type",
        value: type.toLowerCase(),
      });
      window.history.replaceState(null, "", newUrl);
    }
  };
  return (
    <div className="flex items-center gap-5 px-5">
      <p className="text-dark400_light900 body-medium">Type: </p>
      <div className="flex gap-3">
        {GlobalSearchFilters.map((filter) => (
          <button
            onClick={() => handleTypeClick(filter.value)}
            type="button"
            key={filter.value}
            className={`light-border-2 small-medium rounded-2xl px-5 py-2 capitalize dark:text-light-800 dark:hover:text-primary-500 ${
              active === filter.value
                ? "bg-primary-500 text-light-900"
                : "bg-light-700 text-dark-400 hover:text-primary-500 dark:bg-dark-500"
            }`}
          >
            {filter.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GlobalFilters;
