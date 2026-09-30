"use client";

import PlusIcon from "@/src/icons/plus.svg";
import { useState } from "react";

interface Question {
    id: number,
    title: string,
    text: string,
}

function Question({ id, title, text }: Question) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div 
            className="flex flex-col"
            onClick={() => setIsOpen((state) => !state)}
        >
            <div className={`border-b ${isOpen ? "border-foreground-muted" : "border-border"} flex flex-row justify-between px-4 py-2 items-center`}>
                <div className="flex flex-row gap-6 items-center flex-1 min-w-0">
                    <h4 className="text-h4">{id}</h4>
                    <h4 className="text-h4 truncate">{title}</h4>
                </div>

                <div className="pl-3 shrink-0">
                    <PlusIcon className={`text-foreground-muted size-3 ${isOpen && "rotate-45"}`} />
                </div>
            </div>
            
            {isOpen && (
                <div className="bg-elevated text-body p-2 whitespace-pre-line rounded-b-lg">
                    {text}
                </div>
            )}
        </div>
    );
}

export function ServicesFAQ() {
    const questions: Question[] = [
        {
            "id": 1,
            "title": "How much does a project cost?",
            "text": "Q: How much does a project cost?\nA: Every project is different. Small MVPs typically start around $5–10K, while larger systems vary based on scope. We always provide a clear estimate after a free discovery call.",
        },
        {
            "id": 2,
            "title": "How long does development take?",
            "text": "Q: How long does development take?\nA: A typical MVP takes 4–8 weeks. Larger projects are scoped in phases — we'll give you a realistic timeline upfront, not a guess.",
        },
        {
            "id": 3,
            "title": "How do we get started?",
            "text": "Q: How do we get started?\nA: Fill out the contact form or email us directly. We'll schedule a 30-minute discovery call to understand your needs before anything else.",
        },
        {
            "id": 4,
            "title": "Do you work with early-stage startups?",
            "text": "Q: Do you work with early-stage startups?\nA: Yes. We enjoy working with founders who have a clear problem to solve, even if the product isn't fully defined yet.",
        },
        {
            "id": 5,
            "title": "Can you take over an existing project?",
            "text": "Q: Can you take over an existing project?\nA: We can. We'll start with a code audit to understand what's there, then propose the best path forward.",
        },
        {
            "id": 6,
            "title": "Do you provide support after launch?",
            "text": "Q: Do you provide support after launch?\nA: Yes — we offer post-launch maintenance packages and are happy to stay on as a long-term technical partner.",
        },
    ]

    return (
        <div className="bg-background px-6 py-12 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <p className="text-overline text-primary">/ FAQ</p>
                <h2 className="text-h2">Questions We Hear a Lot</h2>
            </div>

            <div className="flex flex-col">
                {questions.map((question) => (
                    <Question key={question.id} id={question.id} title={question.title} text={question.text} />
                ))}
            </div>
        </div>
    );
}