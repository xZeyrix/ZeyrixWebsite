import ReactIcon from "@/src/icons/react.svg";
import NextjsIcon from "@/src/icons/nextjs.svg";
import TypescriptIcon from "@/src/icons/typescript.svg";
import OpenaiIcon from "@/src/icons/openai.svg";
import FigmaIcon from "@/src/icons/figma.svg";
import PythonIcon from "@/src/icons/python.svg";
import FastapiIcon from "@/src/icons/fastapi.svg";
import DockerIcon from "@/src/icons/docker.svg";

interface Technology {
    id: number;
    Icon: any;
    name: any;
}

function Technology({ Icon, name }: Technology) {
    return (
        <div className="bg-elevated border border-border p-4 rounded-lg flex flex-col gap-3 justify-center items-center min-w-25 shrink-0">
            <Icon className="size-7" />
            <p className="text-caption text-foreground-secondary">{name}</p>
        </div>
    );
}

export function ServicesTech() {
    const technologies: Technology[] = [
        {"id": 1, "Icon": PythonIcon, "name": "Python"},
        {"id": 2, "Icon": OpenaiIcon, "name": "OpenAI API"},
        {"id": 3, "Icon": DockerIcon, "name": "Docker"},
        {"id": 4, "Icon": FastapiIcon, "name": "Fastapi"},
        {"id": 5, "Icon": TypescriptIcon, "name": "Typescript"},
        {"id": 6, "Icon": ReactIcon, "name": "React"},
        {"id": 7, "Icon": NextjsIcon, "name": "Next.js"},
        {"id": 8, "Icon": FigmaIcon, "name": "Figma"},
    ]

    return (
        <div className="bg-surface flex flex-col px-6 py-12 gap-12">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <p className="text-overline text-primary">/ OUR TOOLKIT</p>
                    <h1 className="text-h2">Technologies We Work With</h1>
                </div>

                <p className="text-body text-foreground-secondary">We use modern, battle-tested tools — chosen for each project, not forced into every one.</p>
            </div>

            <div className="flex flex-row gap-3 overflow-x-auto">
                {technologies.map((technology) => (
                    <Technology key={technology.id} id={technology.id} Icon={technology.Icon} name={technology.name} />
                ))}
            </div>
        </div>
    );
}