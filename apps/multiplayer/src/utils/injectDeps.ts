import { INestApplication, INestMicroservice } from '@nestjs/common'
import { Room } from 'colyseus'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function injectDeps<T extends { new (...args: any[]): Room }>(
  app: INestMicroservice | INestApplication,
  target: T
): T {
  const selfDeps = Reflect.getMetadata('self:paramtypes', target) || []
  const dependencies = Reflect.getMetadata('design:paramtypes', target) || []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selfDeps.forEach((dep: any) => {
    dependencies[dep.index] = dep.param
  })

  const injectables =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dependencies.map((dependency: any) => {
      return app.get(dependency)
    }) || []

  return class extends target {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    constructor(..._args: any[]) {
      super(...injectables)
    }
  }
}
