import { Loader } from "@googlemaps/js-api-loader"
import { useAction, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { MapPostClusterGroup } from "./MapPostClusterGroup";
import { MapPost } from "./MapPost";
import { PostModal } from "./PostModal";
import { Button, Form, FormControl, InputGroup, Modal, Image, Badge, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { getWindowAI } from "window.ai";

const TAG_TO_COLOR: Map<string, string> = new Map<string, string>([
  ["Food", "red"],
  ["Art", "blue"],
  ["Sports", "green"]
]);

const loader = new Loader({
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  version: "alpha"
});


export const MapComponent = () => {
  const [searchText, setSearchText] = useState<string>("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const threeDMapRef = useRef<any>();
  const AIRef = useRef<any>();
  const postClusterGroupRef = useRef<MapPostClusterGroup| null>(null);
  const searchPosts = useAction(api.posts.searchPosts);
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<{text: string, photoId?:string, relatedUrl?: string, tag?: string} | undefined>(undefined);
  const [AIResponse, setAIResponse] = useState<string | null>(null);
  const [flying, setFlying] = useState(false);
  const [flyThroughPosts, setFlyThroughPosts] = useState<MapPost[]>([]);
  const [windowAIEnabled, setWindowAIEnabled] = useState(false);

  useEffect(() => {
    initMap();
    setupAI()
    
  }, []);

  const setupAI = async () => {
    try {
      AIRef.current = await getWindowAI();
      setWindowAIEnabled(true);
    } catch(e) {
      console.warn("Window.ai is not enabled, AI agent will not run")
    }
  }


  const promptAI = async (prompt: string, relevantPosts: string[]) => {
    let template = "Here are some relevant posts to use for formatting your response:";
    for (const post of relevantPosts) {
      template += `\n- ${post}`;
    }
    template += `\n\nusing this context, respond to the following prompt while keeping your answer under 2 sentences: ${prompt}`;


    const ai = await getWindowAI();
    const [res] = await ai.generateText({ messages: [{role: "user", content: template}] });

    setAIResponse(res.message.content)
  }

  const handleSubmit = async () => {
    setAIResponse(null);
    setLoadingSearch(true);
    if (postClusterGroupRef.current !== null) {
      postClusterGroupRef.current.removeMapResources();
    }

    const res = await searchPosts({text: searchText});

    postClusterGroupRef.current = new MapPostClusterGroup();
    const allPosts: MapPost[] = [];
    for (let i = 0; i < res.posts.length; i++) {
        if (res.scores[i] < 0.4) {
            break;
        }
        const post: MapPost = new MapPost(res.posts[i], (text: string, photoId?: string, relatedUrl?: string, tag?: string) => setSelectedMarker({text, photoId, relatedUrl, tag}));
        allPosts.push(post);
        postClusterGroupRef.current.addPost(post);
        threeDMapRef.current!.append(await post.generateMarker());
    }

    const polygons = await postClusterGroupRef.current.generatePolygons();
    for (const polygon of polygons) {
      threeDMapRef.current!.append(polygon);
    }

    if (postClusterGroupRef.current.postClusters.length > 0) {
      const center = {lat: postClusterGroupRef.current.postClusters[0].posts[0].lat(), lng: postClusterGroupRef.current.postClusters[0].posts[0].lng()};

      interpolate(
        {lat: threeDMapRef.current.center.lat, lng: threeDMapRef.current.center.lng, range: threeDMapRef.current.range},
        {...center, range: 1000},
        2000,
        (current) => {
          threeDMapRef.current.center = {lat: current.lat, lng: current.lng, altitude: threeDMapRef.current.center.altitude};
          threeDMapRef.current.range = current.range;
        },
        () => {
          setSelectedMarker(postClusterGroupRef.current!.postClusters[0].posts[0].postDoc)
        }
      );
    }

    setFlyThroughPosts(allPosts);

    if (windowAIEnabled) {
      await promptAI(searchText, allPosts.map(p => p.postDoc.text));
    }
    setLoadingSearch(false);
  }

  const createFlyThroughWaypoint = (posts: MapPost[]): () => void => {
    const post = posts[0];
    let callback;
    if (posts.length === 1) {
      callback = () => {
        setSelectedMarker(post.postDoc);
        setFlying(false);
      }
    } else {
      callback = () => {
        setSelectedMarker(post.postDoc);
        createFlyThroughWaypoint(posts.slice(1))();
      }
    }

    return () => {
      setTimeout(() => {
        setSelectedMarker(undefined);
        const center = {lat: post.lat(), lng: post.lng()};
        interpolate(
          {lat: threeDMapRef.current.center.lat, lng: threeDMapRef.current.center.lng, range: threeDMapRef.current.range},
          {...center, range: 1000},
          3000,
          (current) => {
            threeDMapRef.current.center = {lat: current.lat, lng: current.lng, altitude: threeDMapRef.current.center.altitude};
            threeDMapRef.current.range = current.range;
          },
          callback
        );
      }, 3000);
    }
  }

  const interpolate = (
    start: {lat: number, lng: number, range: number},
    end: {lat: number, lng: number, range: number},
    durationMS: number,
    onUpdate: (current: {lat: number, lng: number, range: number}) => void,
    callback?: () => void
  ) => {
    const startTime = Date.now()
    const endTime = startTime + durationMS;
    const intervalId = setInterval(() => {
      const now = Date.now();
      if (now > endTime) {
        clearInterval(intervalId);
        onUpdate(end);
        if (callback) {
          callback()
        }
      } else {
        const t = (now - startTime)/(endTime - startTime);
        const currentLatLngRange: {lat: number, lng: number, range: number} = {
          lat: start.lat + (end.lat - start.lat) * t,
          lng: start.lng +  (end.lng - start.lng) * t,
          range: start.range + (end.range - start.range)  * t,
        };
        onUpdate(currentLatLngRange);
      }
    }, 10);
  }

  const initMap = async () => {
    // @ts-ignore
    const maps3d = await loader.importLibrary("maps3d");
    const mapDiv = document.getElementById("map")!;

    // @ts-ignore
    const map3DElement = new maps3d.Map3DElement({
      center: {lat: 40.745780, lng: -73.991070, altitude: 200},
      range: 1000,
        tilt: 60
    });
    map3DElement.defaultLabelsDisabled = true;

    mapDiv.append(map3DElement);

    threeDMapRef.current = map3DElement;
  }

  return (
    <div>
        <div style={{position: "absolute", top: "1vh", width: "100vw", zIndex: 1, display: "flex", justifyContent: "center"}}>
          <div style={{display: "flex", background: "white", padding: 16, width: "50vw", borderRadius: 10}}>
            <Form className="d-flex me-auto" style={{width: "70%"}}onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}>
                <InputGroup>
                  <InputGroup.Text>
                    <FontAwesomeIcon icon={faSearch} onClick={handleSubmit}/>
                  </InputGroup.Text>
                  <FormControl
                    style={{background: "#F2F4F8"}}
                    type="search"
                    value={searchText}
                    onChange={(e: any) => setSearchText(e.target.value)}
                    placeholder="Search Posts..."
                    className="me-2"
                    aria-label="Search"
                    disabled={loadingSearch}
                  />
                </InputGroup>
              </Form>
              {loadingSearch &&
                <Spinner animation="border"/>
              }
              <Button variant="primary" className="ms-auto" disabled={loadingSearch} onClick={() => setShowPostModal(true)}>Add Post</Button>
              
              <Button variant="primary" className="ms-auto" disabled={flying || flyThroughPosts.length === 0} onClick={() => {
                setFlying(true);
                createFlyThroughWaypoint(flyThroughPosts.slice(0, Math.min(5, flyThroughPosts.length)))();
              }}>
                Fly Through
                {
                  flying &&
                  <Spinner animation="border"/>
                }
              </Button>
          </div>
        </div>
          

        <div id="map" style={{height: "100vh"}}></div>

        {AIResponse !== null &&
          <div style={{width: "100vw", height: "20vh", position: "absolute", top: "10vh", display: "flex", justifyContent: "center", alignItems: "center"}}>
            <div style={{background: "white", width: "60vw", height: "70%", border: "2px solid gray", borderRadius: "20px", padding: "8px", overflowY: "scroll"}}>
              <button style={{ float: "right", background: "transparent", border: "none", fontSize: "16px", cursor: "pointer"}} onClick={() => setAIResponse(null)}>
                X
              </button>
              <p>{AIResponse}</p>
            </div>
          </div>
        }

        <PostModal show={showPostModal} hide={() => setShowPostModal(false)}/>
        <MarkerDetailModal show={selectedMarker !== undefined} hide={() => setSelectedMarker(undefined)} text={selectedMarker?.text} photoId={selectedMarker?.photoId}
          relatedUrl={selectedMarker?.relatedUrl} tag={selectedMarker?.tag} />
    </div>
  )
}

const MarkerDetailModal = (props: {show: boolean, hide: () => void, text?: string, photoId?: string, relatedUrl?: string, tag?: string}) => {
  let imageUrl = props.photoId ? useQuery(api.posts.generateDownloadUrl, {photoId: props.photoId!}) : undefined;

  return (
    <Modal show={props.show} onHide={props.hide} centered>
      <Modal.Body>
        <div className="text-center">
          {imageUrl &&
                <Image 
                  src={imageUrl} 
                  rounded 
                  fluid 
                  style={{ maxHeight: '300px', width: 'auto', marginBottom: 16 }}
                  className="shadow-lg"
                />
          }
          <p>
            {props.text}
          </p>
        </div>
        <div style={{display: "flex", flexDirection: "row", marginTop: 64}}>
          {props.relatedUrl &&
            <a href={props.relatedUrl} style={{marginRight: 16, textDecorationLine: "none", fontWeight: "bold"}}>Event Link</a>
          }
          {props.tag &&
            <Badge pill style={{marginLeft: "auto", padding: 8, paddingRight: 24, paddingLeft: 24, backgroundColor: `${TAG_TO_COLOR.get(props.tag!)} !important`}}>
              {props.tag}
            </Badge>
          }
        </div>
      </Modal.Body>
    </Modal>
  )
}


