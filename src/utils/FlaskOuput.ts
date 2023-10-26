import {FlaskModGroup} from "../generated/GeneratedFlaskMods";

export interface FlaskModSettings {
    prefix: string[]
    suffix: string[]
    ilevel: string
    onlyMaxPrefixTierMod: boolean
    onlyMaxSuffixTierMod: boolean
    matchBothPrefixAndSuffix: boolean
    ignoreEffectTiers: boolean
    matchOpenPrefixSuffix: boolean
}


export function minItemLevel(modGroups: FlaskModGroup[], settings: FlaskModSettings): string | undefined {
    const {prefix, suffix, ilevel, onlyMaxPrefixTierMod, onlyMaxSuffixTierMod } = settings;
    const ilevelNumber = isNaN(Number(ilevel)) ? 85 : Number(ilevel);
    if (!onlyMaxSuffixTierMod && !onlyMaxPrefixTierMod) return undefined;

    const prefixIlevels = prefix.map((modStr) => {
        const mod = modGroups.find((modGroup) => modGroup.description === modStr);
        return mod ? findIlevel(mod, ilevelNumber) : undefined;
    }).filter((i) => { return i !== undefined && onlyMaxPrefixTierMod}) as number[];

    const suffixIlevels = suffix.map((modStr) => {
        const mod = modGroups.find((modGroup) => modGroup.description === modStr);
        return mod ? findIlevel(mod, ilevelNumber) : undefined;
    }).filter((i) => { return i !== undefined && onlyMaxSuffixTierMod}) as number[];

    if (prefixIlevels.length === 0 && !onlyMaxSuffixTierMod) return undefined;
    if (suffixIlevels.length === 0 && !onlyMaxPrefixTierMod) return undefined;

    const itemLevels = prefixIlevels.concat(suffixIlevels);
    if (itemLevels.length === 0) {
        return undefined;
    }
    const minIlevel = Math.max(...itemLevels);
    return `minimum flask item level: ${minIlevel}`;
}

export function generateFlaskOutput(modGroups: FlaskModGroup[], settings: FlaskModSettings): string {
    const {prefix, suffix, ilevel, onlyMaxPrefixTierMod, onlyMaxSuffixTierMod, matchBothPrefixAndSuffix, ignoreEffectTiers, matchOpenPrefixSuffix} = settings;
    const ilevelNumber = isNaN(Number(ilevel)) ? 85 : Number(ilevel);

    const prefixRegex = prefix.map((p => {
        const mod = modGroups.find((modGroup) => modGroup.description === p);
        return mod ? findRegex(mod, ilevelNumber, onlyMaxPrefixTierMod) : undefined;
    })).filter((v) => v !== undefined).join("|");

    const suffixRegex = suffix.map((p => {
        const mod = modGroups.find((modGroup) => modGroup.description === p);
        return mod ? findRegex(mod, ilevelNumber, onlyMaxSuffixTierMod) : undefined;
    })).filter((v) => v !== undefined).join("|");

    const filteredPrefixRegex = replaceEffectTier(prefixRegex, modGroups, ignoreEffectTiers);
    const openPrefix = "^[a-z]+ Flask";
    const openSuffix = "Flask$";

    if (filteredPrefixRegex.length > 0 && suffixRegex.length > 0) {
        if (matchBothPrefixAndSuffix) {
            if (matchOpenPrefixSuffix) {
                return `"${filteredPrefixRegex}"|"${openPrefix}" "${suffixRegex}"|"${openSuffix}"`;
            } else {
                return `"${filteredPrefixRegex}" "${suffixRegex}"`;
            }
        } else {
            return `"${filteredPrefixRegex}|${suffixRegex}"`;
        }
    } else if (filteredPrefixRegex.length > 0) {
        if (matchOpenPrefixSuffix) {
            return `"${filteredPrefixRegex}"|"${openPrefix}"`;
        } else {
            return `"${filteredPrefixRegex}"`;
        }
    } else if (suffixRegex.length > 0) {
        if (matchOpenPrefixSuffix) {
            return `"${suffixRegex}"|"${openSuffix}"`;
        }
        return `"${suffixRegex}"`;
    } else {
        return "";
    }
}

function replaceEffectTier(regex: string, modGroups: FlaskModGroup[], ignoreEffectTiers: boolean): string {
    if (ignoreEffectTiers) {
        const effectMod = modGroups.find((f) => f.description.includes("reduced Duration"));
        if (!effectMod) {
            return regex;
        }
        const tieredEffectRegexs = effectMod.mods.map((e) => e.regex);
        const tierReplaceRegex = new RegExp(tieredEffectRegexs.join("|"));
        return regex.replace(tierReplaceRegex, effectMod.regex)
    }
    return regex;
}

function findIlevel(modGroup: FlaskModGroup, ilevelNumber: number): number | undefined {
    const possibleMods = modGroup.mods.filter((m) => m.level <= ilevelNumber);
    if (possibleMods.length > 0) {
        return possibleMods.reduce((a, b) => a.level > b.level ? a : b).level
    }
    return undefined;
}

function findRegex(modGroup: FlaskModGroup, ilevelNumber: number, onlyMaxTierMod: boolean): string | undefined {
    const possibleMods = modGroup.mods.filter((m) => m.level <= ilevelNumber);
    if (onlyMaxTierMod && possibleMods.length > 0) {
        return possibleMods.reduce((a, b) => a.level > b.level ? a : b).regex
    }
    if (!onlyMaxTierMod && modGroup.minLevel <= ilevelNumber) {
        return modGroup.regex;
    }
    return undefined;
}