import { useAction, useMutation } from "convex/react";
import { useEffect, useState } from "react"
import { Alert, Button, Form, Modal, Image, Container } from "react-bootstrap";
import { api } from "../convex/_generated/api";

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

export const PostModal = (props: {show: boolean, hide: () => void}) => {
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
        altitude: null,
    });
    const [error, setError] = useState<String | null>(null);
    const [inputText, setInputText] = useState('');
    const [relatedUrl, setRelatedUrl] = useState('');
    const [selectedTag, setSelectedTag] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const makePost = useAction(api.posts.createPost);
    const generateUploadUrl = useMutation(api.posts.generateUploadUrl);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleSubmitPost = async () => {
        console.log(
            {
                text: inputText,
                lat: location.latitude,
                lng: location.longitude,
                alt: location.altitude,
                url: relatedUrl,
                tag: selectedTag
            }
        )

        if (inputText === null || inputText === "") {
            setError("Please provide some text for the post");
            return;
        }

        if (relatedUrl !== null && relatedUrl !== "" && !isValidUrl(relatedUrl)) {
            setError("The provided url is invalid");
            return;
        }

        const postArgs: any = {
            text: inputText,
            lat: location.latitude ?? 0,
            lng: location.longitude ?? 0,
            altitude: location.altitude ?? 0
        }

        if (relatedUrl !== null && relatedUrl !== "") {
            postArgs["relatedUrl"] = relatedUrl; 
        }

        if (selectedTag !== null && selectedTag !== "") {
            postArgs["tag"] = selectedTag; 
        }

        if (selectedFile !== null) {
            const postUrl = await generateUploadUrl();
            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": selectedFile!.type },
                body: selectedFile,
            });
            const {storageId} = await result.json();
            postArgs["photoId"] = storageId;
        }
    
        makePost(postArgs);

        props.hide();
    }

    const setTag = (tag: string) => {
        if (tag === selectedTag) {
            setSelectedTag("");
        } else {
            setSelectedTag(tag);
        }
    }
    
    useEffect(() => {
        const success = (pos: { coords: { latitude: any; longitude: any; altitude: any; }; }) => {
            const { latitude, longitude, altitude } = pos.coords;
            setLocation({ latitude, longitude, altitude });
        };

        const failure = (err: { message: string }) => {
            setError(err.message);
        };


        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(success, failure, {
                enableHighAccuracy: true,
            });
        } else {
            setError('Geolocation is not supported by this browser.');
        }
    }, []);

    return (
        <Modal show={props.show} onHide={props.hide} centered>
            <Modal.Body style={{padding: 0}}>
                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>Error: {error}</Alert>}
                <div style={{padding: 16, paddingBottom: 0}}>
                    <h3>Device Location</h3>
                    <p style={{marginBottom: 2}}>
                        <span style={{color: "gray", marginRight: 8}}>Lat:</span>
                        {location.latitude === null ? "unavailable" : location.latitude}
                        <Image src={location.latitude === null ? "./reject.png" : "./check.png"} width={16} style={{marginLeft: 4}}/>
                    </p>
                    <p style={{marginBottom: 2}}>
                        <span style={{color: "gray", marginRight: 8}}>Lng:</span>
                        {location.longitude === null ? "unavailable" : location.longitude}
                        <Image src={location.longitude === null ? "./reject.png" : "./check.png"} width={16} style={{marginLeft: 4}}/>
                    </p>
                    <p style={{marginBottom: 2}}>
                        <span style={{color: "gray", marginRight: 8}}>Alt:</span>
                        {location.altitude === null ? "unavailable" : location.altitude}
                        <Image src={location.altitude === null ? "./reject.png" : "./check.png"} width={16} style={{marginLeft: 4}}/>
                    </p>
                </div>
                <hr/>

                <Container>
                    <Form.Group controlId="formInputText" style={{marginBottom: 24}}>
                        <Form.Label>Post Text <span style={{color: "red"}}>*</span></Form.Label>
                        <Form.Control
                            type="text"
                            value={inputText}
                            onChange={(e: any) => setInputText(e.target.value)}
                            placeholder="Enter some text..."
                        />
                    </Form.Group>

                    <Form.Group controlId="formInputUrl" style={{marginBottom: 24}}>
                        <Form.Label>Event Link</Form.Label>
                        <Form.Control
                            type="text"
                            value={relatedUrl}
                            onChange={(e: any) => setRelatedUrl(e.target.value)}
                            placeholder="Optional Event Link"
                        />
                    </Form.Group>

                    <Form.Group style={{marginBottom: 24}}>
                        <Form.Label className="d-flex">
                            <Button as="label" htmlFor="fileInput" variant="primary">
                                Upload Image
                            </Button>
                        </Form.Label>
                        <Form.Control 
                            id="fileInput"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        {selectedFile && <div style={{ marginTop: 10 }}>{selectedFile.name}</div>}
                    </Form.Group>

                    <div>
                        <ToggleButton name="Food" color="red" selectedTag={selectedTag} setTag={setTag}/>
                        <ToggleButton name="Art" color="blue" selectedTag={selectedTag} setTag={setTag}/>
                        <ToggleButton name="Sports" color="green" selectedTag={selectedTag} setTag={setTag}/>
                    </div>
                </Container>

            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={props.hide}>
                    Close
                </Button>
                <Button variant="primary" onClick={handleSubmitPost} disabled={location.latitude === null}>
                    Send
                </Button>
            </Modal.Footer>
        </Modal>
    )
}

const ToggleButton = (props: {name: string, color: string, selectedTag: string, setTag: (tag: string) => void}) => (
    <Button style={{margin: 4, padding: 0, width: 70, borderRadius: 10, 
        color: props.selectedTag === props.name ? "white" : props.color, borderColor: props.selectedTag === props.name ? "none": props.color, 
        background: props.selectedTag === props.name ? props.color : "white"}} onClick={() => props.setTag(props.name)}>{props.name}</Button>
)