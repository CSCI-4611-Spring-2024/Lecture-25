/* Lecture 25: Programming with 3D Rays
 * CSCI 4611, Spring 2024, University of Minnesota
 * Instructor: Evan Suma Rosenberg <suma@umn.edu>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import * as gfx from 'gophergfx'
import { GUI } from 'dat.gui'

export class App extends gfx.GfxApp
{
    public boundingVolumeMode: string;
    public raycastMode: string;

    private cameraControls: gfx.FirstPersonControls;
    private pickMesh: gfx.Mesh3;
    private pickRayLine: gfx.Mesh3;
    private pickRayMarker: gfx.Mesh3;
    private boundsMesh: gfx.Mesh3;
    private boundsMaterial: gfx.BoundingVolumeMaterial;


    // --- Create the App class ---
    constructor()
    {
        // initialize the base class gfx.GfxApp
        super();

        this.cameraControls = new gfx.FirstPersonControls(this.camera); 
        
        this.pickMesh = gfx.MeshLoader.loadOBJ('./assets/bunny.obj');

        this.boundsMesh = this.pickMesh.createInstance();
        this.boundsMaterial = new gfx.BoundingVolumeMaterial();

        this.pickRayLine = gfx.Geometry3Factory.createBox(1, 1, 1);
        this.pickRayMarker = gfx.Geometry3Factory.createSphere(0.02, 2);

        this.boundingVolumeMode = 'None';
        this.raycastMode = 'Box';
    }


    // --- Initialize the graphics scene ---
    createScene(): void 
    {
        // Setup camera
        this.camera.setPerspectiveCamera(60, 1920/1080, .1, 750);
        this.camera.position.set(0, 1, 0);

        // Configure camera controls
        this.cameraControls.mouseButton = 2;
        this.cameraControls.translationSpeed = 2;

        // Create the scene lighting
        const sceneLight = new gfx.PointLight();
        sceneLight.ambientIntensity.set(0.15, 0.15, 0.15);
        sceneLight.diffuseIntensity.set(1, 1, 1);
        sceneLight.specularIntensity.set(1, 1, 1);
        sceneLight.position.set(0, 5, 5);
        this.scene.add(sceneLight);

        // Create the skybox material
        const skyboxMaterial = new gfx.UnlitMaterial();
        skyboxMaterial.color.set(0.749, 0.918, 0.988);
        skyboxMaterial.side = gfx.Side.BACK;

        // Add the skybox to the scene
        const skybox = gfx.Geometry3Factory.createBox(500, 500, 500);
        skybox.material = skyboxMaterial;
        this.scene.add(skybox);

        // Create the ground material
        const groundMaterial = new gfx.PhongMaterial();
        groundMaterial.diffuseColor.set(0, 0.5, 0);

        // Add the ground mesh to the scene
        const ground = gfx.Geometry3Factory.createBox(500, 10, 500);
        ground.position.set(0, -5, 0);
        ground.material = groundMaterial;
        this.scene.add(ground);

        this.pickMesh.position.set(0, 1.1, -3.5);
        this.pickMesh.rotation.setRotationY(Math.PI/4);
        this.pickMesh.scale.set(2, 2, 2);
        this.pickMesh.material.setColor(new gfx.Color(0, 0.5, 1));
        this.scene.add(this.pickMesh);

        this.boundsMesh.material = this.boundsMaterial;
        this.boundsMesh.visible = false;
        this.pickMesh.add(this.boundsMesh);

        this.pickRayLine.material = new gfx.UnlitMaterial();
        this.pickRayLine.material.setColor(new gfx.Color(1, 0, 1));
        this.pickRayLine.visible = false;
        this.scene.add(this.pickRayLine);

        this.pickRayMarker.material = new gfx.PhongMaterial();
        this.pickRayMarker.material.setColor(new gfx.Color(1, 0, 0));
        this.pickRayMarker.visible = false;
        this.scene.add(this.pickRayMarker);

        this.createGUI();
    }


    private createGUI(): void
    {
        // Create the GUI
        const gui = new GUI();
        gui.width = 200;

        const boundingVolumeController = gui.add(this, 'boundingVolumeMode', [
            'None',
            'Box',
            'Sphere'
        ]);
        boundingVolumeController.name('Bounds');
        boundingVolumeController.onChange(()=>{
            if(this.boundingVolumeMode == 'Box')
            {
                this.boundsMaterial.mode = gfx.BoundingVolumeMode.ORIENTED_BOUNDING_BOX;
                this.boundsMesh.visible = true;
            }
            else if(this.boundingVolumeMode == 'Sphere')
            {
                this.boundsMaterial.mode = gfx.BoundingVolumeMode.BOUNDING_SPHERE;
                this.boundsMesh.visible = true;
            }
            else
            {
                this.boundsMesh.visible = false;
            }
        });

        const raycastController = gui.add(this, 'raycastMode', [
            'Box',
            'Sphere',
            'Mesh'
        ]);
        raycastController.name('Raycast');
    }


    // --- Update is called once each frame by the main graphics loop ---
    update(deltaTime: number): void 
    {
        this.cameraControls.update(deltaTime);
    }


    onMouseDown(event: MouseEvent): void 
    {
        // Exit the event handler if we did not click the left mouse button
        if(event.button != 0)
            return;

        const deviceCoords = this.getNormalizedDeviceCoordinates(event.x, event.y);

        const ray = new gfx.Ray3();
        ray.setPickRay(deviceCoords, this.camera);

        let intersection: gfx.Vector3 | null;
        if(this.raycastMode == 'Box')
            intersection = ray.intersectsOrientedBoundingBox(this.pickMesh);
        else if(this.raycastMode == 'Sphere')
            intersection = ray.intersectsOrientedBoundingSphere(this.pickMesh);
        else
            intersection = ray.intersectsMesh3(this.pickMesh);

        if(intersection)
        {
            this.pickRayMarker.position.copy(intersection);

            const pickRayLineOrigin = this.camera.position.clone();
            pickRayLineOrigin.y -= 0.05;
            const distance = pickRayLineOrigin.distanceTo(intersection);

            const S = gfx.Matrix4.makeScale(new gfx.Vector3(0.005, 0.005, distance));
            const R = gfx.Matrix4.lookAt(pickRayLineOrigin, intersection, gfx.Vector3.UP);
            const T = gfx.Matrix4.makeTranslation(new gfx.Vector3(0, 0, -distance/2));
            const M = gfx.Matrix4.multiplyAll(R, T, S);
            this.pickRayLine.setLocalToParentMatrix(M, false);
            
            this.pickRayMarker.visible = true;
            this.pickRayLine.visible = true;

            // exit the event handler to skip further intersection tests
            return;
        }

        const groundPlane = new gfx.Plane3(gfx.Vector3.ZERO, gfx.Vector3.UP);
        const groundIntersection = ray.intersectsPlane(groundPlane);
        if(groundIntersection)
        {

            const pickRayLineOrigin = this.camera.position.clone();
            pickRayLineOrigin.y -= 0.05;

            const groundDistance = pickRayLineOrigin.distanceTo(groundIntersection);
            const S = gfx.Matrix4.makeScale(new gfx.Vector3(0.005, 0.005, groundDistance));
            const R = gfx.Matrix4.lookAt(pickRayLineOrigin, groundIntersection, gfx.Vector3.UP);
            const T = gfx.Matrix4.makeTranslation(new gfx.Vector3(0, 0, -groundDistance/2));
            const M = gfx.Matrix4.multiplyAll(R, T, S);
            this.pickRayLine.setLocalToParentMatrix(M, false);

            this.pickRayLine.visible = true;
            this.pickRayMarker.visible = true;
            this.pickRayMarker.position.copy(groundIntersection);

            // exit the event handler to skip further intersection tests
            return;
        }

        // if we did not find an intersection, set the line and marker to invisible
        this.pickRayLine.visible = false;
        this.pickRayMarker.visible = false;
    }
}