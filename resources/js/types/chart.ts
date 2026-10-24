export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut';

export type ChartDataset = {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
};

export type ChartSpec = {
    type: ChartType;
    title?: string;
    labels: string[];
    datasets: ChartDataset[];
};

const chartTypes = new Set<string>(['bar', 'line', 'pie', 'doughnut']);
const colorPattern =
    /^(#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|(?:rgb|rgba|hsl|hsla)\([\d.%\s,/-]+\)|[a-z]{1,20})$/i;

function isChartType(value: unknown): value is ChartType {
    return typeof value === 'string' && chartTypes.has(value);
}

function isColor(value: unknown): value is string {
    return typeof value === 'string' && colorPattern.test(value);
}

function isColorValue(value: unknown): value is string | string[] {
    return (
        isColor(value) ||
        (Array.isArray(value) && value.length <= 50 && value.every(isColor))
    );
}

export function parseChartSpec(source: string): ChartSpec | null {
    let value: unknown;

    try {
        value = JSON.parse(source);
    } catch {
        return null;
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return null;
    }

    const candidate = value as Record<string, unknown>;

    if (
        !isChartType(candidate.type) ||
        !Array.isArray(candidate.labels) ||
        candidate.labels.length === 0 ||
        candidate.labels.length > 50 ||
        !candidate.labels.every(
            (label) => typeof label === 'string' && label.length <= 100,
        ) ||
        !Array.isArray(candidate.datasets) ||
        candidate.datasets.length === 0 ||
        candidate.datasets.length > 10
    ) {
        return null;
    }

    const labels = candidate.labels as string[];
    const type = candidate.type;
    const datasets: ChartDataset[] = [];

    for (const dataset of candidate.datasets) {
        if (
            typeof dataset !== 'object' ||
            dataset === null ||
            Array.isArray(dataset)
        ) {
            return null;
        }

        const item = dataset as Record<string, unknown>;

        if (
            typeof item.label !== 'string' ||
            item.label.length === 0 ||
            item.label.length > 100 ||
            !Array.isArray(item.data) ||
            item.data.length !== labels.length ||
            !item.data.every(
                (point) =>
                    typeof point === 'number' &&
                    Number.isFinite(point) &&
                    (type === 'bar' || type === 'line' || point >= 0),
            )
        ) {
            return null;
        }

        const parsed: ChartDataset = {
            label: item.label,
            data: item.data as number[],
        };

        for (const colorKey of ['backgroundColor', 'borderColor'] as const) {
            const color = item[colorKey];

            if (color !== undefined) {
                if (!isColorValue(color)) {
                    return null;
                }

                parsed[colorKey] = color;
            }
        }

        if (item.borderWidth !== undefined) {
            if (
                typeof item.borderWidth !== 'number' ||
                !Number.isFinite(item.borderWidth) ||
                item.borderWidth < 0 ||
                item.borderWidth > 20
            ) {
                return null;
            }

            parsed.borderWidth = item.borderWidth;
        }

        if (item.fill !== undefined) {
            if (typeof item.fill !== 'boolean') {
                return null;
            }

            parsed.fill = item.fill;
        }

        if (item.tension !== undefined) {
            if (
                typeof item.tension !== 'number' ||
                !Number.isFinite(item.tension) ||
                item.tension < 0 ||
                item.tension > 1
            ) {
                return null;
            }

            parsed.tension = item.tension;
        }

        datasets.push(parsed);
    }

    if (
        candidate.title !== undefined &&
        (typeof candidate.title !== 'string' || candidate.title.length > 150)
    ) {
        return null;
    }

    return {
        type,
        labels,
        datasets,
        ...(typeof candidate.title === 'string'
            ? { title: candidate.title }
            : {}),
    };
}
