import { describe, expect, it } from 'vitest';
import { getNavigationItems, type NavigationDropdownItem } from '../src/utils/navigation';
import { getVisibleSharedSkills } from '../src/utils/skills';

// Ein im Admin angelegter Skill bekam zwar eine Seite (`/aquarelle/`), tauchte
// aber nirgends auf: die Liste unter „Services" stand von Hand in
// navigation.json, und die kann der Admin nicht bearbeiten. Seit
// `fillServicesWithSkills` ist skills.json die eine Quelle – dieser Test hält
// fest, dass die beiden nicht wieder auseinanderlaufen können.

const servicesOf = (): NavigationDropdownItem | undefined =>
  getNavigationItems().find(
    (item): item is NavigationDropdownItem => 'children' in item && item.label === 'Services',
  );

describe('Services-Menü folgt skills.json', () => {
  const skills = getVisibleSharedSkills();

  it('es gibt überhaupt Skills zum Anzeigen', () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it('listet JEDEN sichtbaren Skill – auch neu angelegte', () => {
    const services = servicesOf();
    expect(services).toBeDefined();
    expect(services!.children.map((c) => c.url)).toEqual(skills.map((s) => s.link));
    expect(services!.children.map((c) => c.label)).toEqual(skills.map((s) => s.title));
  });

  it('listet nichts, was kein Skill (mehr) ist', () => {
    const links = new Set(skills.map((s) => s.link));
    for (const child of servicesOf()!.children) {
      expect(links.has(child.url)).toBe(true);
    }
  });

  it('lässt das Events-Menü daneben unangetastet', () => {
    // Events werden nach demselben Muster abgeleitet – die beiden dürfen sich
    // nicht gegenseitig überschreiben.
    const labels = getNavigationItems().map((i) => i.label);
    expect(labels).toContain('Services');
    expect(labels).toContain('Events');
  });
});
