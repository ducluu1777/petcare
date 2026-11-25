export type PetSpecies = "DOG" | "CAT";

export interface PetCreateDraft {
	name: string;
	species: PetSpecies;
	breed: string;
	weightKg: string;
	ageMonths: string;
	notes: string;
	hasVaccine: boolean;
}
