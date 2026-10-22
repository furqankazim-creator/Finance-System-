type DependencyCount = {
  label: string;
  count: number;
};

const pluralize = (count: number, label: string) =>
  `${count} ${label}${count === 1 ? "" : "s"}`;

export const buildDependencyError = (
  resourceLabel: string,
  dependencies: DependencyCount[]
) => {
  const activeDependencies = dependencies.filter((dependency) => dependency.count > 0);
  const summary = activeDependencies
    .map((dependency) => pluralize(dependency.count, dependency.label))
    .join(", ");

  return {
    message: `Cannot delete this ${resourceLabel} because it is still referenced by ${summary}.`,
    details: activeDependencies,
  };
};
