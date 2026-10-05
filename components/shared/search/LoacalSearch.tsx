"use client";
import { Input } from "@/components/ui/input";
import { formUrlQuery, removeKeysFromQuery } from "@/lib/utils";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState, useTransition } from "react";
interface CustomInputProps {
  route: string;
  iconPosition: string;
  imgSrc: string;
  placeholder: string;
  otherClasses?: string;
}
const LoacalSearch = ({
  iconPosition,
  imgSrc,
  placeholder,
  otherClasses,
}: CustomInputProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("q");

  const [search, setSearch] = useState(query || "");
  const [isPending, startTransition] = useTransition();
  const [previousQuery, setPreviousQuery] = useState(query);
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  if (query !== previousQuery) {
    setPreviousQuery(query);
    if (query !== submittedQuery && search !== (query || "")) {
      setSearch(query || "");
    }
    setSubmittedQuery(null);
  }

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      if (search) {
        if (search !== query) {
          const newUrl = formUrlQuery({
            params: params.toString(),
            key: "q",
            value: search,
          });
          setSubmittedQuery(search);
          startTransition(() => router.replace(newUrl, { scroll: false }));
        }
      } else {
        if (query) {
          const newUrl = removeKeysFromQuery({
            params: searchParams.toString(),
            keysToRemove: ["q", "page"],
          });
          setSubmittedQuery(null);
          startTransition(() => router.replace(newUrl, { scroll: false }));
        }
      }
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [search, router, searchParams, query, startTransition]);

  return (
    <div
      className={`background-light800_darkgradient flex min-h-[56px] grow items-center gap-4 rounded-[10px] px-4 ${otherClasses}`}
    >
      {iconPosition === "left" && (
        <Image
          src={imgSrc}
          alt="search icon"
          width={24}
          height={24}
          className="cursor-pointer"
        />
      )}
      <Input
        type="text"
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="paragraph-regular no-focus placeholder text-dark400_light700 border-none bg-transparent shadow-none outline-none"
      />
      {isPending && <span className="small-regular text-dark400_light700" role="status">Searching…</span>}
      {iconPosition === "right" && (
        <Image
          src={imgSrc}
          alt="search icon"
          width={24}
          height={24}
          className="cursor-pointer"
        />
      )}
    </div>
  );
};

export default LoacalSearch;
