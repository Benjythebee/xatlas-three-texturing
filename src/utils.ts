import {
	Vector2,
    BufferGeometry,
    BufferAttribute
} from 'three';

/**
 * tool for "unwrapping" and debugging three.js geometries UV mapping
 *
 * Sample usage:
 *	document.body.appendChild( UVsDebug( new THREE.SphereGeometry( 10, 10, 10, 10 ) );
 *
 */

function UVsDebug( geometry:BufferGeometry, size = 1024, indexedUVs = true ) {

	// handles wrapping of uv.x > 1 only

	const a = new Vector2();
	const b = new Vector2();

	const uvs = [
		new Vector2(),
		new Vector2(),
		new Vector2()
	];

	const face = [];

	const canvas = document.createElement( 'canvas' );
	const width = size; // power of 2 required for wrapping
	const height = size;
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext( '2d' );
    if(!ctx) throw new Error("Could not create 2d context");
	ctx.lineWidth = 1;
	ctx.strokeStyle = 'rgb( 63, 63, 63 )';
	ctx.textAlign = 'center';

	// paint background white

	ctx.fillStyle = 'rgb( 255, 255, 255 )';
	ctx.fillRect( 0, 0, width, height );

	if ( (geometry as any).isGeometry ) {

		console.error( 'THREE.UVsDebug no longer supports Geometry. Use THREE.BufferGeometry instead.' );
		return;

	} else {

		const index = geometry.index;
		const uvAttribute = geometry.attributes.uv as BufferAttribute;

		if ( index ) {

			// indexed geometry

			for ( let i = 0, il = index.count; i < il; i += 3 ) {

				face[ 0 ] = index.getX( i );
				face[ 1 ] = index.getX( i + 1 );
				face[ 2 ] = index.getX( i + 2 );

				uvs[ 0 ].fromBufferAttribute( uvAttribute, face[ 0 ] );
				uvs[ 1 ].fromBufferAttribute( uvAttribute, face[ 1 ] );
				uvs[ 2 ].fromBufferAttribute( uvAttribute, face[ 2 ] );

				processFace( uvs);

			}

		} else {

			// non-indexed geometry

			for ( let i = 0, il = uvAttribute.count; i < il; i += 3 ) {

				face[ 0 ] = i;
				face[ 1 ] = i + 1;
				face[ 2 ] = i + 2;

				uvs[ 0 ].fromBufferAttribute( uvAttribute, face[ 0 ] );
				uvs[ 1 ].fromBufferAttribute( uvAttribute, face[ 1 ] );
				uvs[ 2 ].fromBufferAttribute( uvAttribute, face[ 2 ] );

				processFace(  uvs );

			}

		}

	}

	return canvas;

	function processFace( uvs: Vector2[] ) {

		// draw contour of face
        if(!ctx) throw new Error("Could not create 2d context");
		ctx.beginPath();

		a.set( 0, 0 );

        console.log(uvs)
		for ( let j = 0, jl = uvs.length; j < jl; j ++ ) {
			const uv = uvs[ j ];

			a.x += uv.x;
			a.y += uv.y;

			if ( j === 0 ) {

				ctx.moveTo( uv.x * ( width - 2 ) + 0.5, ( 1 - uv.y ) * ( height - 2 ) + 0.5 );

			} else {

				ctx.lineTo( uv.x * ( width - 2 ) + 0.5, ( 1 - uv.y ) * ( height - 2 ) + 0.5 );

			}

		}

		ctx.closePath();
		ctx.stroke();

		// calculate center of face

		a.divideScalar( uvs.length );

		for ( let j = 0, jl = uvs.length; j < jl; j ++ ) {

			const uv = uvs[ j ];
			b.addVectors( a, uv ).divideScalar( 2 );
		}

	}

}

export { UVsDebug };


