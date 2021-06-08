import {
  ExpoAppManifest,
  ExpoAppManifestWithRuntimeVersion,
  ExpoAppManifestWithSdk,
  ExpoConfig,
  getConfig,
  PackageJSONConfig,
  ProjectTarget,
} from '@expo/config';

import { Env, ExponentTools, XDLError } from '../internal';

export type PublishOptions = {
  releaseChannel?: string;
  target?: ProjectTarget;
  resetCache?: boolean;
  maxWorkers?: number;
  quiet?: boolean;
};

export async function getPublishExpConfigAsync(
  projectRoot: string,
  options: Pick<PublishOptions, 'releaseChannel'>
): Promise<{
  exp: ExpoAppManifestWithSdk | ExpoAppManifestWithRuntimeVersion;
  pkg: PackageJSONConfig;
  hooks: ExpoConfig['hooks'];
}> {
  if (options.releaseChannel != null && typeof options.releaseChannel !== 'string') {
    throw new XDLError('INVALID_OPTIONS', 'releaseChannel must be a string');
  }
  options.releaseChannel = options.releaseChannel || 'default';

  // Verify that exp/app.json and package.json exist
  const { exp: privateExp } = getConfig(projectRoot, { skipSDKVersionRequirement: true });
  const { hooks } = privateExp;
  const { exp, pkg } = getConfig(projectRoot, {
    isPublicConfig: true,
    skipSDKVersionRequirement: !!privateExp.runtimeVersion,
  });

  // we can't publish with both sdkVersion and runtimeVerson specified, so ensure we pick one or the other.
  const xorExp = exp.runtimeVersion
    ? ({ ...exp, sdkVersion: undefined } as ExpoAppManifestWithRuntimeVersion)
    : (exp as ExpoAppManifestWithSdk);

  // Only allow projects to be published with UNVERSIONED if a correct token is set in env
  if (exp.sdkVersion === 'UNVERSIONED' && !Env.maySkipManifestValidation()) {
    throw new XDLError('INVALID_OPTIONS', 'Cannot publish with sdkVersion UNVERSIONED.');
  }

  exp.locales = await ExponentTools.getResolvedLocalesAsync(projectRoot, exp);
  return {
    exp: xorExp,
    pkg,
    hooks,
  };
}
