import { shouldUseMockData } from "./is-mock-mode";

/** Runtime picks mock vs prisma repo; types only need to share the same public API. */
export function createRepositoryProxy<T extends object>(mockRepo: T, prismaRepo: object): T {
  return new Proxy({} as T, {
    get(_target, prop: string | symbol) {
      const mockValue = Reflect.get(mockRepo, prop);

      if (typeof mockValue === "function") {
        return (...args: unknown[]) =>
          shouldUseMockData().then((useMock) => {
            const repo = useMock ? mockRepo : prismaRepo;
            const method = Reflect.get(repo, prop) as (...methodArgs: unknown[]) => unknown;
            return method.apply(repo, args);
          });
      }

      return mockValue;
    },
  });
}
