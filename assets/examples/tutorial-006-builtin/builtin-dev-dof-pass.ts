/*
 Copyright (c) 2021-2024 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights to
 use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 of the Software, and to permit persons to whom the Software is furnished to do so,
 subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

import {
    _decorator, assert, CCBoolean, CCFloat, CCInteger,
    gfx, Material, renderer, rendering, Vec3, Vec4,
} from 'cc';

import { EDITOR } from 'cc/env';

import {
    BuiltinDevPipelineSettings
} from './builtin-dev-pipeline-settings';

import {
    BuiltinDevPipelinePassBuilder
} from './builtin-dev-pipeline-pass';

import {
    CameraConfigs,
    PipelineConfigs,
    PipelineContext,
} from './builtin-dev-pipeline';

const { ccclass, disallowMultiple, executeInEditMode, menu, property, requireComponent, type } = _decorator;

const { Color, LoadOp, StoreOp } = gfx;

export interface DofPassConfigs {
    enableDof: boolean;
}

@ccclass('BuiltinDevDepthOfFieldPass')
@menu('Rendering/BuiltinDevDepthOfFieldPass')
@requireComponent(BuiltinDevPipelineSettings)
@disallowMultiple
@executeInEditMode
export class BuiltinDevDepthOfFieldPass extends BuiltinDevPipelinePassBuilder
    implements rendering.PipelinePassBuilder {
    @property({
        group: { id: 'BuiltinPass', name: 'Pass Settings', style: 'section' },
        type: CCInteger,
    })
    configOrder = 0;
    @property({
        group: { id: 'BuiltinPass', name: 'Pass Settings', style: 'section' },
        type: CCInteger,
    })
    renderOrder = 150;

    @property
    _enableDof = false;
    @property
    _material: Material | null = null;
    @property
    _minRange = 0;
    @property
    _maxRange = 50;
    @property
    _blurRadius = 1;
    @property
    _intensity = 1;
    @property
    _focusPos = new Vec3(0, 0, 0);

    // DepthOfField
    @property({
        group: { id: 'DepthOfField', name: 'DepthOfField (PostProcessing)', style: 'section' },
        type: CCBoolean,
        visible: true,
    })
    set dofEnable(value: boolean) {
        this._enableDof = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get dofEnable(): boolean {
        return this._enableDof;
    }

    @property({
        group: { id: 'DepthOfField', name: 'DepthOfField (PostProcessing)', style: 'section' },
        type: Material,
        visible: true,
    })
    set dofMaterial(value: Material) {
        if (this._material === value) {
            return;
        }
        this._material = value;
        if (EDITOR) {
            this._parent._tryEnableEditorPreview();
        }
    }
    get dofMaterial(): Material {
        return this._material!;
    }

    @property({
        group: { id: 'DepthOfField', name: 'DepthOfField (PostProcessing)', style: 'section' },
        type: CCFloat,
        min: 0,
        visible: true,
    })
    set dofMinRange(value: number) {
        this._minRange = value;
    }
    get dofMinRange(): number {
        return this._minRange;
    }

    @property({
        group: { id: 'DepthOfField', name: 'DepthOfField (PostProcessing)', style: 'section' },
        type: CCFloat,
        min: 0,
        visible: true,
    })
    set dofMaxRange(value: number) {
        this._maxRange = value;
    }
    get dofMaxRange(): number {
        return this._maxRange;
    }

    @property({
        group: { id: 'DepthOfField', name: 'DepthOfField (PostProcessing)', style: 'section' },
        type: CCFloat,
        range: [0.0, 2, 0.01],
        slide: true,
        visible: true,
    })
    set dofIntensity(value: number) {
        this._intensity = value;
    }
    get dofIntensity(): number {
        return this._intensity;
    }

    @type(CCFloat)
    @property({
        group: { id: 'DepthOfField', name: 'DepthOfField (PostProcessing)', style: 'section' },
        type: CCFloat,
        range: [0.01, 10, 0.01],
        slide: true,
        visible: true,
    })
    set dofBlurRadius(value: number) {
        this._blurRadius = value;
    }
    get dofBlurRadius(): number {
        return this._blurRadius;
    }

    @type(Vec3)
    @property({
        group: { id: 'DepthOfField', name: 'DepthOfField (PostProcessing)', style: 'section' },
        type: Vec3,
        visible: true,
    })
    set dofFocusPos(value: Vec3) {
        this._focusPos = value;
    }
    get dofFocusPos(): Vec3 {
        return this._focusPos;
    }

    // PipelinePassBuilder
    getConfigOrder(): number {
        return this.configOrder;
    }
    getRenderOrder(): number {
        return this.renderOrder;
    }
    configCamera(
        camera: Readonly<renderer.scene.Camera>,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: Readonly<CameraConfigs> & DofPassConfigs): void {
        cameraConfigs.enableDof = pplConfigs.supportDepthSample
            && this._enableDof
            && !!this._material;

        if (cameraConfigs.enableDof) {
            // Output scene depth, this is allowed but has performance impact
            (cameraConfigs as CameraConfigs).enableStoreSceneDepth = true;
            (cameraConfigs as CameraConfigs).enablePostProcess = true;
        }
    }
    windowResize(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: Readonly<CameraConfigs & DofPassConfigs>,
        window: renderer.RenderWindow,
        camera: renderer.scene.Camera,
        nativeWidth: number,
        nativeHeight: number): void {
        const id = window.renderWindowId;
        if (cameraConfigs.enableDof) {
            const halfWidth = Math.max(Math.floor(cameraConfigs.width / 2), 1);
            const halfHeight = Math.max(Math.floor(cameraConfigs.height / 2), 1);
            // `DofCoc${id}` texture will reuse ldrColorName
            ppl.addRenderTarget(`DofRadiance${id}`, cameraConfigs.radianceFormat, cameraConfigs.width, cameraConfigs.height);
            ppl.addRenderTarget(`DofPrefilter${id}`, cameraConfigs.radianceFormat, halfWidth, halfHeight);
            ppl.addRenderTarget(`DofBokeh${id}`, cameraConfigs.radianceFormat, halfWidth, halfHeight);
            ppl.addRenderTarget(`DofFilter${id}`, cameraConfigs.radianceFormat, halfWidth, halfHeight);
        }
    }
    setup(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        cameraConfigs: Readonly<CameraConfigs & DofPassConfigs>,
        camera: renderer.scene.Camera,
        context: PipelineContext,
        prevRenderPass?: rendering.BasicRenderPassBuilder): rendering.BasicRenderPassBuilder | undefined {
        if (!cameraConfigs.enableDof) {
            return undefined;
        }
        const id = cameraConfigs.renderWindowId;

        assert(!!this._material);
        const prevColorName = context.colorName;
        const prevDepthStencilName = context.depthStencilName;

        context.colorName = `DofRadiance${id}`;

        const ldrColorName = cameraConfigs.enableShadingScale
            ? `ScaledLdrColor${id}`
            : `LdrColor${id}`;

        this._addDepthOfFieldPasses(ppl, pplConfigs, this._material,
            camera, cameraConfigs.width, cameraConfigs.height,
            prevColorName, prevDepthStencilName,
            context.colorName, ldrColorName);

        return undefined;
    }
    private _addDepthOfFieldPasses(
        ppl: rendering.BasicPipeline,
        pplConfigs: Readonly<PipelineConfigs>,
        dofMaterial: Material,
        camera: renderer.scene.Camera,
        width: number,
        height: number,
        dofRadianceName: string,
        depthStencil: string,
        radianceName: string,
        ldrColorName: string,
    ): void {
        this._cocParams.x = this._minRange;
        this._cocParams.y = this._maxRange;// camera.farClip;// this._focusRange;
        this._cocParams.z = this._blurRadius;
        this._cocParams.w = this._intensity;
        this._focusPosVec4.x = this._focusPos.x;
        this._focusPosVec4.y = this._focusPos.y;
        this._focusPosVec4.z = this._focusPos.z;
        this._cocTexSize.x = 1.0 / width;
        this._cocTexSize.y = 1.0 / height;
        this._cocTexSize.z = width;
        this._cocTexSize.w = height;
        const blurName = ldrColorName;

        // Blur Pass
        const blurPass = ppl.addRenderPass(width, height, 'cc-dof-blur');
        blurPass.addRenderTarget(blurName, LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
        blurPass.addTexture(dofRadianceName, 'screenTex');
        blurPass.setVec4('g_platform', pplConfigs.platform);
        blurPass.setVec4('blurParams', this._cocParams);
        blurPass.setVec4('mainTexTexelSize', this._cocTexSize);
        blurPass
            .addQueue(rendering.QueueHint.OPAQUE)
            .addCameraQuad(camera, dofMaterial, 0); // addCameraQuad will set camera related UBOs
        // coc pass
        const cocPass = ppl.addRenderPass(width, height, 'cc-dof-coc');
        cocPass.addRenderTarget(radianceName, LoadOp.CLEAR, StoreOp.STORE, this._clearColorTransparentBlack);
        cocPass.addTexture(blurName, 'colorTex');
        cocPass.addTexture(depthStencil, "DepthTex");
        cocPass.addTexture(dofRadianceName, "screenTex");
        cocPass.setVec4('g_platform', pplConfigs.platform);
        cocPass.setMat4('proj', camera.matProj);
        cocPass.setMat4('invProj', camera.matProjInv);
        cocPass.setMat4('viewMatInv', camera.node.worldMatrix);
        cocPass.setVec4('cocParams', this._cocParams);
        cocPass.setVec4('focus', this._focusPosVec4);
        cocPass
            .addQueue(rendering.QueueHint.OPAQUE)
            .addCameraQuad(camera, dofMaterial, 1);
    }

    // Runtime members
    private readonly _clearColorTransparentBlack = new Color(0, 0, 0, 0);
    private readonly _cocParams = new Vec4(0, 0, 0, 0);
    private readonly _focusPosVec4 = new Vec4(0, 0, 0, 1);
    private readonly _cocTexSize = new Vec4(0, 0, 0, 0);
}
