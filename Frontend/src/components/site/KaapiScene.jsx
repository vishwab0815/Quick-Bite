import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { prefersReducedMotion } from './motion';

const GOLD = 0xd9a441;
const CUBES = 7;

/** A turned shape (tumbler, davara) from a side profile of [radius, height] points */
const lathe = (profile, material) => {
    const geometry = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 96);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, material);
};

/** A soft round shadow drawn on a canvas, laid under the set */
const contactShadow = () => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(128, 128, 10, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0,0,0,0.75)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.01;
    return mesh;
};

/**
 * A filter-kaapi set, modelled and lit in WebGL: a brass tumbler standing in its davara,
 * with the coffee inside, and small gold cubes orbiting it. It turns slowly, leans towards
 * the pointer, and only renders while on screen.
 */
const KaapiScene = ({ className = '' }) => {
    const hostRef = useRef(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return undefined;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        host.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
        camera.position.set(0, 2.2, 8.6);
        camera.lookAt(0, 0.7, 0);

        const key = new THREE.DirectionalLight(0xffd9a0, 2.2);
        key.position.set(-3, 5, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffb45c, 1.2);
        rim.position.set(4, 3, -3);
        scene.add(rim);

        const brass = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.26 });
        const brassInside = new THREE.MeshStandardMaterial({ color: 0xb8862e, metalness: 1, roughness: 0.4, side: THREE.BackSide });
        const coffee = new THREE.MeshPhysicalMaterial({ color: 0x2b1608, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.2 });
        const foam = new THREE.MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.95 });

        const set = new THREE.Group();

        // Davara: the wide, shallow bowl the tumbler stands in
        const davara = lathe([[0, 0], [1.15, 0], [1.25, 0.12], [1.33, 0.5], [1.42, 0.68], [1.46, 0.74], [1.38, 0.74], [1.3, 0.56], [1.18, 0.14], [1.06, 0.1], [0, 0.1]], brass);
        set.add(davara);

        // Tumbler: tall, flaring slightly, with a rolled lip
        const tumbler = lathe([[0, 0], [0.56, 0], [0.6, 0.25], [0.66, 0.95], [0.72, 1.42], [0.8, 1.52], [0.84, 1.58], [0.78, 1.6], [0.72, 1.52], [0.66, 1.42], [0.6, 0.95], [0.52, 0.1], [0, 0.1]], brass);
        tumbler.position.y = 0.1;
        set.add(tumbler);
        const inner = lathe([[0.52, 0.1], [0.6, 0.95], [0.66, 1.42], [0.72, 1.52]], brassInside);
        inner.position.y = 0.1;
        set.add(inner);

        // The coffee, with a ring of foam at the edge
        const drink = new THREE.Mesh(new THREE.CircleGeometry(0.64, 64), coffee);
        drink.rotation.x = -Math.PI / 2;
        drink.position.y = 1.38;
        set.add(drink);
        const froth = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.07, 12, 64), foam);
        froth.rotation.x = -Math.PI / 2;
        froth.position.y = 1.4;
        set.add(froth);

        set.add(contactShadow());
        set.position.y = -0.9;
        scene.add(set);

        // Gold cubes orbiting the set at different heights and speeds
        const cubes = [];
        const cubeGeometry = new THREE.BoxGeometry(0.26, 0.26, 0.26);
        for (let index = 0; index < CUBES; index++) {
            const cube = new THREE.Mesh(cubeGeometry, brass);
            const angle = (index / CUBES) * Math.PI * 2;
            cube.userData = { angle, radius: 2.1 + (index % 3) * 0.45, height: -0.4 + (index % 4) * 0.55, speed: 0.12 + (index % 3) * 0.05, spin: 0.4 + index * 0.1, scale: 0.6 + (index % 3) * 0.3 };
            cube.scale.setScalar(cube.userData.scale);
            scene.add(cube);
            cubes.push(cube);
        }

        // Size to the host, and keep the set framed on narrow hosts
        const resize = () => {
            const width = host.clientWidth || 1;
            const height = host.clientHeight || 1;
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.position.z = width / height < 0.9 ? 10.5 : 8.6;
            camera.updateProjectionMatrix();
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(host);

        // Lean towards the pointer, gently
        const target = { x: 0, y: 0 };
        const onMove = (event) => {
            if (event.pointerType !== 'mouse') return;
            target.x = (event.clientX / window.innerWidth - 0.5) * 2;
            target.y = (event.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('pointermove', onMove, { passive: true });

        // Render only while on screen
        let visible = true;
        const watcher = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
        }, { rootMargin: '10% 0px' });
        watcher.observe(host);

        const still = prefersReducedMotion();
        const clock = new THREE.Clock();
        let frame = 0;
        const lean = { x: 0, y: 0 };
        const loop = () => {
            frame = requestAnimationFrame(loop);
            if (!visible || document.visibilityState !== 'visible') return;
            const time = clock.getElapsedTime();
            if (!still) {
                lean.x += (target.x - lean.x) * 0.04;
                lean.y += (target.y - lean.y) * 0.04;
                set.rotation.y = time * 0.25 + lean.x * 0.5;
                set.rotation.x = lean.y * 0.18;
                set.position.y = -0.9 + Math.sin(time * 0.8) * 0.05;
                for (const cube of cubes) {
                    const data = cube.userData;
                    const angle = data.angle + time * data.speed;
                    cube.position.set(Math.cos(angle) * data.radius, data.height + Math.sin(time * 0.9 + data.angle) * 0.15, Math.sin(angle) * data.radius);
                    cube.rotation.set(time * data.spin, time * data.spin * 0.7, 0);
                }
            }
            renderer.render(scene, camera);
        };
        loop();

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            watcher.disconnect();
            window.removeEventListener('pointermove', onMove);
            scene.traverse((object) => {
                object.geometry?.dispose();
                if (object.material) {
                    object.material.map?.dispose();
                    object.material.dispose();
                }
            });
            scene.environment?.dispose();
            pmrem.dispose();
            renderer.dispose();
            renderer.domElement.remove();
        };
    }, []);

    return <div ref={hostRef} className={`kaapi-scene ${className}`} aria-hidden="true" />;
};

KaapiScene.propTypes = { className: PropTypes.string };

export default KaapiScene;
