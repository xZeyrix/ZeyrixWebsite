"use client";

import { ServiceProps, Question } from "@/src/data/services";
import PlusIcon from "@/src/icons/plus.svg";
import { useState } from "react";

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

export function ServiceFAQ({ service }: ServiceProps) {
    return (
        <div className="bg-background px-6 py-12 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <p className="text-overline text-primary">/ FAQ</p>
                <h2 className="text-h2">Questions About This Service</h2>
            </div>

            <div className="flex flex-col">
                {service.questions.map((question, index) => (
                    <Question key={index} id={index + 1} title={question.title} text={question.text} />
                ))}
            </div>
        </div>
    );
}