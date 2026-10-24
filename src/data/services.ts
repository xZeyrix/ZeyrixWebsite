import ReactIcon from "@/src/icons/react.svg";
import NextjsIcon from "@/src/icons/nextjs.svg";
import TypescriptIcon from "@/src/icons/typescript.svg";

type ServicePreview = {
    title: string,
    text: string,
    url: string,
    tags: string[],
}

type Tech = {
    Icon: any,
    name: string,
}

interface Question {
    order: number,
    title: string,
    text: string,
}

export type Service = {
    title: string,
    text: string,
    preview: ServicePreview,
    tech: Tech[],
    questions: Question[],
}

export const services: Record<string, Service> = {
    "Custom-Software-Development": {
        title: "Custom Software Development",
        text: "The development of a custom system for your needs.",
        preview: {
            title: "Custom Software Development",
            text: "The development of a custom system for your needs.",
            url: "https://developers.elementor.com/docs/assets/img/elementor-placeholder-image.png",
            tags: ["React", "Next.js", "Typescript"],
        },
        tech: [
            { Icon: ReactIcon, name: "React" },
            { Icon: NextjsIcon, name: "Next.js" },
            { Icon: TypescriptIcon, name: "Typescript" },
        ],
        questions: [
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
        ],
    },
}