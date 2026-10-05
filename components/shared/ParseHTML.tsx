"use client";
import React, { useEffect, useRef } from "react";

import Prism from "prismjs";
import parse from "html-react-parser";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-aspnet";
import "prismjs/components/prism-sass";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-solidity";
import "prismjs/components/prism-json";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-r";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-go";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-mongodb";
import "prismjs/plugins/line-numbers/prism-line-numbers.js";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";

interface Props {
  data: string;
}

const ParseHTML = ({ data }: Props) => {
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const content = contentRef.current;
    if (!content?.querySelector("code")) return;

    // Highlight only this post, after the navigation has had a chance to paint.
    const highlight = () => Prism.highlightAllUnder(content);
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(highlight, { timeout: 500 });
      return () => window.cancelIdleCallback(handle);
    }
    const handle = setTimeout(highlight, 0);
    return () => clearTimeout(handle);
  }, [data]);

  return <div ref={contentRef} className={` markdown w-full min-w-full`}>{parse(data)}</div>;
};

export default ParseHTML;
