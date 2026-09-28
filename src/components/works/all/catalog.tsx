"use client";

import { randomUUID } from "crypto";
import { PrimaryButton, SecondaryButton } from "@/src/components/reusable/buttons";
import { works, Work, subCategory, filters } from "@/src/data/works";
import { useState } from 'react';

function Tag({ text }: { text: string }) {
    return (
        <div className="bg-elevated text-foreground rounded-md px-3 py-1 text-caption shrink-0">
            {text}
        </div>
    );
}

function Work({ preview }: Work) {
    return (
        <div className="bg-surface border border-border p-6 rounded-2xl flex flex-col gap-6 items-center">
            <img src={preview.url} alt="image" className="rounded-lg" />
            
            <div className="flex flex-col gap-3 items-center">
                <div className="flex flex-row gap-10"> 
                    <p className="text-overline text-primary">{preview.category}</p>
                    <p className="text-overline text-foreground-muted">{preview.subCategory}</p>
                </div>

                <div className="flex flex-col gap-1 items-center">
                    <h4 className="text-h4 text-center">{preview.title}</h4>
                    <p className="text-body-sm text-center">{preview.text}</p>
                </div>
            </div>

            <div className="flex flex-col gap-3 w-full">
                <div className="w-full flex flex-row justify-center">
                    <div className="flex flex-row overflow-x-auto gap-2 w-fit scrollbar-none">
                        {preview.tags.map((text) => (
                            <Tag key={text} text={text} />
                        ))}
                    </div>
                </div>
    
                <PrimaryButton text="Primary" />
                <SecondaryButton text="Secondary" />
            </div>
        </div>
    )
}

function Filter({ filter, isCurrent, setFilter }: { filter: subCategory, isCurrent: boolean, setFilter: (name: string) => void }) {
    return (
        <button 
            className={`
                rounded-full px-3 py-3 text-btn shrink-0 min-w-15
                ${isCurrent ? "bg-primary text-background" : "bg-surface border border-border text-foreground"}
            `}
            onClick={() => setFilter(filter)}
        >
            {filter}
        </button>
    );
}

export function WorksCatalog() {
    const [currentFilter, setCurrentFilter] = useState<subCategory>("All");
    const worksToDisplay = Object.values(works).filter((work) => { return work.preview.subCategory === currentFilter || currentFilter === "All" });

    return (
        <div className="flex flex-col bg-background">
            <div className="flex flex-row gap-2 overflow-x-auto scrollbar-none py-4 pl-6">
                {filters.map((filter) => (
                    <Filter key={filter} filter={filter} isCurrent={filter === currentFilter} setFilter={(newFilter) => setCurrentFilter(newFilter)} />
                ))}
            </div>
            
            {worksToDisplay.length > 0 ? (
                <div className="px-6 flex flex-col gap-6 pb-12">
                    {worksToDisplay.map((work) => (
                        <Work key={work.preview.title} preview={work.preview} />
                    ))}
                </div>
            ) : (
                <div className="px-6 flex flex-col min-h-50 items-center justify-center gap-1">
                    <h2 className="text-h2">No works</h2>
                    <p className="text-body text-foreground-secondary text-center">It seems that's no works in this category yet.</p>
                </div>
            )}
        </div>
    );
}