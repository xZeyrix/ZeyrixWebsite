import ReactIcon from "@/src/icons/react.svg";
import NextjsIcon from "@/src/icons/nextjs.svg";
import TypescriptIcon from "@/src/icons/typescript.svg";

export type subCategory = "All" | "AI & ML" | "Web" | "Mobile" | "API" | "Consulting";
export const filters: subCategory[] = ["All", "AI & ML", "Web", "API", "Mobile", "Consulting"]

type WorkPreview = {
    category: string,
    subCategory: subCategory,
    title: string,
    text: string,
    url: string,
    tags: string[],
}

type StandarkBlock = {
    title: string,
    text: string,
}

type Result = {
    title: string,
    table: Record<string, string>,
}

type Review = {
    name: string,
    post: string,
    text: string,
}

type Work = {
    title: string,
    text: string,
    preview: WorkPreview,
    headerTable: Record<string, string>,
    imageUrl: string,
    challenge: StandarkBlock,
    solution: StandarkBlock,
    result: Result,
    tech: string[],
    review: Review,

}

export const works: Record<string, Work> = {
    "Custom-Software-Development": {
        title: "Custom Software Development",
        text: "The development of a custom system for your needs.",
        preview: {
            category: "SoftwareDev",
            subCategory: "AI & ML",
            title: "Custom Software Development",
            text: "The development of a custom system for your needs.",
            url: "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png",
            tags: ["React", "Next.js", "Typescript", "Anthropic API"],
        },
        headerTable: {
            "Timeline": "12 weeks",
            "Team Size": "1",
            "Result": "+50% income",
        },
        imageUrl: "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png",
        challenge: { title: "Manual Support, Fragmented Data", text: "The client was handling customer communication manually through Telegram while important business data was scattered across spreadsheets, CRMs, and internal tools. Response times were inconsistent, repetitive questions overloaded managers, and scaling support without hiring more staff became increasingly difficult." },
        solution: { title: "AI Telegram Manager with Database Integration", text: "We built a custom AI-powered Telegram manager connected directly to the client’s internal database and business systems. The assistant handles customer inquiries automatically, retrieves real-time information, answers context-aware questions, and escalates complex requests when needed — all within the existing Telegram workflow." },
        result: { title: "Faster, Cheaper, More Accurate", table: { "-70%": "Manual review time", "$180K": "Saved per year", "99.2%": "Model accuracy" } },
        tech: ["Python", "PostgreSQL", "Docker", "OpenAI API"],
        review: { name: "John Doe", post: "Founder", text: "Zeyrix didn't just build a tool — they understood our business. The system paid for itself in the first quarter." },
    },
}